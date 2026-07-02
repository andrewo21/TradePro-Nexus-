import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const ADMIN_ALLOWED_EMAILS = new Set([
  "andrew@tradepronexus.com",
  "andrew@tradeprotech.ai",
]);

const RATE_LIMITS: Record<string, { limit: number; windowMs: number }> = {
  "/api/registry/claim": { limit: 10, windowMs: 60 * 60 * 1000 },
  "/api/registry/unsubscribe": { limit: 20, windowMs: 60 * 60 * 1000 },
};

// In-memory per-instance counters — not shared across Vercel regions/instances and
// resets on cold start. A basic abuse deterrent, not a hard distributed guarantee.
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
let sweepCounter = 0;

function getClientIp(request: NextRequest): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

function checkRateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; resetAt: number } {
  const now = Date.now();
  // Periodic sweep so the map doesn't grow unbounded on long-lived instances.
  if (++sweepCounter % 500 === 0) {
    for (const [k, v] of rateLimitStore) {
      if (now > v.resetAt) rateLimitStore.delete(k);
    }
  }

  const entry = rateLimitStore.get(key);
  if (!entry || now > entry.resetAt) {
    const resetAt = now + windowMs;
    rateLimitStore.set(key, { count: 1, resetAt });
    return { allowed: true, resetAt };
  }
  if (entry.count >= limit) return { allowed: false, resetAt: entry.resetAt };
  entry.count++;
  return { allowed: true, resetAt: entry.resetAt };
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  if (pathname.startsWith("/api/admin/")) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email || !ADMIN_ALLOWED_EMAILS.has(user.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return supabaseResponse;
  }

  const rateLimit = RATE_LIMITS[pathname];
  if (rateLimit) {
    const ip = getClientIp(request);
    const { allowed, resetAt } = checkRateLimit(`${pathname}:${ip}`, rateLimit.limit, rateLimit.windowMs);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)) } }
      );
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
