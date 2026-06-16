import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// ── RSS sources ──────────────────────────────────────────────────────────────

const SOURCES = [
  // Industry news & trade press
  { name: "Engineering News-Record",          url: "https://www.enr.com/rss/articles" },
  { name: "Construction Dive",                url: "https://www.constructiondive.com/feeds/news/" },
  { name: "Construction Executive",           url: "https://constructionexec.com/feed" },
  { name: "For Construction Pros",            url: "https://www.forconstructionpros.com/rss" },
  { name: "Metal Construction News",          url: "https://www.metalconstructionnews.com/rss" },
  { name: "Construction Specifier",           url: "https://constructionspecifier.com/rss" },
  { name: "Modern Contractor Solutions",      url: "https://www.mcsmag.com/rss" },
  { name: "Buildings.com",                   url: "https://www.buildings.com/__rss/website-scheduled-content.xml?input=%7B%22sectionAlias%22%3A%22home%22%7D" },
  // Safety & regulatory
  { name: "Safety+Health Magazine",           url: "https://www.safetyandhealthmagazine.com/rss" },
  { name: "OSHA News Releases",               url: "https://www.osha.gov/news/newsreleases.xml" },
  { name: "Labor Press",                      url: "https://laborpress.org/feed" },
  // Trade-specific
  { name: "Electrical Contractor Magazine",   url: "https://www.ecmweb.com/__rss/website-scheduled-content.xml?input=%7B%22sectionAlias%22%3A%22home%22%7D" },
  { name: "Contracting Business",             url: "https://www.contractingbusiness.com/__rss/website-scheduled-content.xml?input=%7B%22sectionAlias%22%3A%22home%22%7D" },
  { name: "Plumbing Perspective",             url: "https://www.plumbingperspective.com/feed" },
  // Skilled labor & workforce development
  { name: "SkillsUSA",                        url: "https://www.skillsusa.org/feed" },
  { name: "NCCER",                            url: "https://www.nccer.org/rss" },
  // Trades & unions
  { name: "United Brotherhood of Carpenters", url: "https://www.carpenters.org/rss" },
  { name: "IBEW",                             url: "https://www.ibew.org/rss" },
  // Industry associations
  { name: "AGC News",                         url: "https://news.agc.org/feed/" },
  { name: "Constructor Magazine",             url: "https://news.agc.org/category/constructor-magazine/feed/" },
];

const MAX_PER_SOURCE = 3;

// ── Simple RSS/Atom parser ────────────────────────────────────────────────────

function extractTag(xml: string, tag: string): string {
  const cdata = xml.match(new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>`, "i"));
  if (cdata) return cdata[1].trim();
  const plain = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return plain ? plain[1].trim() : "";
}

function extractAtomLink(xml: string): string {
  const m = xml.match(/<link[^>]+href=["']([^"']+)["'][^>]*(?:\/>|>)/i);
  return m ? m[1] : "";
}

function cleanText(text: string): string {
  return text
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(text: string, max = 220): string {
  if (text.length <= max) return text;
  return text.slice(0, max).replace(/\s+\S*$/, "") + "…";
}

function extractPubDate(xml: string): Date | null {
  const raw = extractTag(xml, "pubDate") ||
              extractTag(xml, "published") ||
              extractTag(xml, "dc:date") ||
              extractTag(xml, "updated");
  if (!raw) return null;
  try {
    const d = new Date(raw.trim());
    return isNaN(d.getTime()) ? null : d;
  } catch { return null; }
}

const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;

interface RSSItem { title: string; link: string; summary: string; imageUrl: string; }

function parseItems(xml: string): RSSItem[] {
  const items: RSSItem[] = [];
  const cutoff = Date.now() - SIXTY_DAYS_MS;
  const pattern = /<(?:item|entry)[^>]*>([\s\S]*?)<\/(?:item|entry)>/gi;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(xml)) !== null) {
    const block = m[1];

    // Skip articles older than 60 days
    const pubDate = extractPubDate(block);
    if (pubDate && pubDate.getTime() < cutoff) continue;

    const title = cleanText(extractTag(block, "title"));
    const link =
      extractTag(block, "link") ||
      extractAtomLink(block) ||
      extractTag(block, "id");
    const rawSummary =
      extractTag(block, "description") ||
      extractTag(block, "summary") ||
      extractTag(block, "content:encoded") ||
      extractTag(block, "content");
    const summary = truncate(cleanText(rawSummary));
    const imageUrl = extractImage(block);
    if (title && link && link.startsWith("http")) {
      items.push({ title, link: link.trim(), summary, imageUrl });
    }
    if (items.length >= MAX_PER_SOURCE * 5) break;
  }
  return items;
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (_req: Request) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Check enabled flag
  const { data: settings } = await supabase
    .from("admin_settings")
    .select("key, value")
    .in("key", ["news_feed_enabled", "news_feed_last_run"]);

  const sm: Record<string, string> = {};
  for (const row of settings ?? []) sm[row.key] = row.value;

  if (sm["news_feed_enabled"] === "false") {
    return new Response(JSON.stringify({ skipped: "disabled" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Throttle: skip if last run < 30 minutes ago
  const lastRun = sm["news_feed_last_run"];
  if (lastRun && lastRun !== "never") {
    const age = Date.now() - new Date(lastRun).getTime();
    if (age < 30 * 60 * 1000) {
      return new Response(JSON.stringify({ skipped: "throttled", lastRun }), {
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // Load already-posted URLs
  const { data: existing } = await supabase.from("news_feed_log").select("article_url");
  const posted = new Set<string>((existing ?? []).map((r: { article_url: string }) => r.article_url));

  let totalPosted = 0;
  const results: Record<string, number> = {};

  for (const source of SOURCES) {
    try {
      const res = await fetch(source.url, {
        signal: AbortSignal.timeout(8000),
        headers: { "User-Agent": "TradePro Nexus RSS Reader/1.0" },
      });
      if (!res.ok) { results[source.name] = 0; continue; }
      const xml = await res.text();
      const items = parseItems(xml);

      let sourceCount = 0;
      for (const item of items) {
        if (posted.has(item.link)) continue;
        if (sourceCount >= MAX_PER_SOURCE) break;

        const content = item.summary || `New update from ${source.name}.`;

        const { data: post, error: postErr } = await supabase
          .from("feed_posts")
          .insert({
            author_id:        null,
            author_type:      "news",
            content,
            project_name:     item.title,
            trade_tags:       [],
            image_urls:       [],
            is_moderated:     false,
            is_industry_news: true,
            news_source_name: source.name,
            news_article_url: item.link,
          })
          .select("id")
          .single();

        if (postErr || !post) continue;

        await supabase.from("news_feed_log").insert({
          article_url:  item.link,
          source_name:  source.name,
          feed_post_id: post.id,
        });

        posted.add(item.link);
        sourceCount++;
        totalPosted++;
      }
      results[source.name] = sourceCount;
    } catch {
      // Unreachable feed — skip silently
      results[source.name] = 0;
    }
  }

  const now = new Date().toISOString();
  await supabase.from("admin_settings").upsert([
    { key: "news_feed_last_run",   value: now },
    { key: "news_feed_last_count", value: String(totalPosted) },
  ], { onConflict: "key" });

  return new Response(
    JSON.stringify({ ok: true, posted: totalPosted, sources: results }),
    { headers: { "Content-Type": "application/json" } }
  );
});
