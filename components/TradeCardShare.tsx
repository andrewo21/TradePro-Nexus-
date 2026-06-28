"use client";

import { useState, useRef, useCallback } from "react";
import { Download, Link2, Check, Loader2 } from "lucide-react";

interface Props {
  slug: string;
  firstName: string;
  lastName: string;
  firmName?: string | null;
  trade?: string | null;
  yearsExperience?: number | null;
  locationCity?: string | null;
  locationState?: string | null;
  availabilityStatus?: string | null;
  avatarUrl?: string | null;
  unionMember?: boolean;
  unionName?: string | null;
  unionLocalNumber?: string | null;
  certifications?: string[];
  legacyMember?: boolean;
  earnedBadgeSlugs?: string[];
}

const SIZE    = 1080;
const SITE    = "https://www.tradepronexus.com";

export default function TradeCardShare({
  slug, firstName, lastName, firmName, trade, yearsExperience,
  locationCity, locationState, availabilityStatus, avatarUrl,
  unionMember, unionName, unionLocalNumber, certifications = [],
  legacyMember, earnedBadgeSlugs = [],
}: Props) {
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const profileUrl = `${SITE}/pro/${slug}`;
  const displayName = firmName || `${firstName} ${lastName}`;
  const initials = `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
  const isAvailable = availabilityStatus === "available";

  const copyLink = useCallback(() => {
    navigator.clipboard.writeText(profileUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [profileUrl]);

  const generateAndDownload = useCallback(async () => {
    setGenerating(true);
    try {
      const canvas = canvasRef.current!;
      canvas.width  = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext("2d")!;

      // ── Background ─────────────────────────────────────────────────────────
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, SIZE, SIZE);

      // ── Orange top bar ─────────────────────────────────────────────────────
      ctx.fillStyle = "#f97316";
      ctx.fillRect(0, 0, SIZE, 12);

      // ── Logo area (top left) ───────────────────────────────────────────────
      ctx.fillStyle = "#f1f5f9";
      ctx.font      = "bold 52px -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif";
      ctx.fillText("TradePro", 72, 108);
      ctx.fillStyle = "#f97316";
      ctx.fillText(" Nexus", 72 + ctx.measureText("TradePro").width, 108);

      // ── Truss mark SVG-like ────────────────────────────────────────────────
      // (simple geometric representation)
      const lx = 72, ly = 60;
      ctx.strokeStyle = "#f1f5f9"; ctx.lineWidth = 4; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(lx, ly+30); ctx.lineTo(lx+20, ly); ctx.lineTo(lx+40, ly+30); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(lx+5, ly+22); ctx.lineTo(lx+35, ly+22); ctx.stroke();
      ctx.beginPath(); ctx.fillStyle="#f97316"; ctx.arc(lx+20, ly+30, 4, 0, Math.PI*2); ctx.fill();

      // ── Avatar circle ──────────────────────────────────────────────────────
      const cx = SIZE / 2, cy = 380, r = 160;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();

      let photoLoaded = false;
      if (avatarUrl) {
        try {
          const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const i = new Image(); i.crossOrigin = "anonymous";
            i.onload = () => resolve(i);
            i.onerror = reject;
            i.src = avatarUrl;
          });
          ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
          photoLoaded = true;
        } catch { /* fall through to initials */ }
      }

      if (!photoLoaded) {
        ctx.fillStyle = "#431407";
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
        ctx.fillStyle = "#f97316";
        ctx.font = "bold 120px -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(initials, cx, cy);
      }
      ctx.restore();

      // Orange ring
      ctx.beginPath();
      ctx.arc(cx, cy, r + 6, 0, Math.PI * 2);
      ctx.strokeStyle = "#f97316";
      ctx.lineWidth = 6;
      ctx.stroke();

      // ── Availability dot ───────────────────────────────────────────────────
      if (isAvailable) {
        ctx.beginPath();
        ctx.arc(cx + r * 0.72, cy + r * 0.72, 28, 0, Math.PI * 2);
        ctx.fillStyle = "#22c55e";
        ctx.fill();
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 6;
        ctx.stroke();
      }

      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";

      // ── Name ───────────────────────────────────────────────────────────────
      ctx.fillStyle = "#f1f5f9";
      ctx.font = `900 ${displayName.length > 20 ? "64" : "76"}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif`;
      ctx.fillText(displayName.slice(0, 28), SIZE / 2, 625);

      // ── Trade ──────────────────────────────────────────────────────────────
      if (trade) {
        ctx.fillStyle = "#f97316";
        ctx.font = "600 52px -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif";
        ctx.fillText(trade, SIZE / 2, 698);
      }

      // ── Meta row ───────────────────────────────────────────────────────────
      const metaParts: string[] = [];
      if (yearsExperience) metaParts.push(`${yearsExperience} yrs exp`);
      if (locationCity && locationState) metaParts.push(`${locationCity}, ${locationState}`);
      else if (locationState) metaParts.push(locationState);
      if (isAvailable) metaParts.push("Available Now");

      if (metaParts.length) {
        ctx.fillStyle = "#64748b";
        ctx.font = "500 40px -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif";
        ctx.fillText(metaParts.join("  |  "), SIZE / 2, 762);
      }

      // ── Badges row ─────────────────────────────────────────────────────────
      const badges: string[] = [];
      if (legacyMember)                              badges.push("Legacy Member");
      if (earnedBadgeSlugs.includes("active_member")) badges.push("Active Member");
      if (unionMember) {
        const u = [unionName, unionLocalNumber ? `Local ${unionLocalNumber}` : null].filter(Boolean).join(" ");
        badges.push(u || "Union Member");
      }

      if (badges.length) {
        let bx = SIZE / 2 - (badges.join("  ").length * 14);
        ctx.font = "700 34px -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif";
        for (const badge of badges) {
          const bw = ctx.measureText(badge).width + 40;
          const isLegacy = badge === "Legacy Member";
          ctx.fillStyle = isLegacy ? "#92400e" : "#1e293b";
          const bby = 840;
          roundRect(ctx, bx - bw / 2, bby - 40, bw, 56, 14);
          ctx.fill();
          ctx.fillStyle = isLegacy ? "#fbbf24" : "#94a3b8";
          ctx.fillText(badge, bx, bby);
          bx += bw + 20;
        }
      }

      // ── QR code (bottom right) ─────────────────────────────────────────────
      try {
        const qrUrl  = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&bgcolor=0f172a&color=f1f5f9&data=${encodeURIComponent(profileUrl)}`;
        const qrImg  = await new Promise<HTMLImageElement>((resolve, reject) => {
          const i = new Image(); i.crossOrigin = "anonymous";
          i.onload = () => resolve(i);
          i.onerror = reject;
          i.src = qrUrl;
        });
        ctx.drawImage(qrImg, SIZE - 220, SIZE - 230, 180, 180);
      } catch { /* qr optional */ }

      // ── Certifications (up to 3) ───────────────────────────────────────────
      if (certifications.length > 0) {
        ctx.fillStyle = "#475569";
        ctx.font = "500 32px -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif";
        ctx.fillText(certifications.slice(0, 3).join("  ·  "), SIZE / 2, 900);
      }

      // ── Site URL ───────────────────────────────────────────────────────────
      ctx.fillStyle = "#f1f5f9";
      ctx.font = "600 38px -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif";
      ctx.fillText("tradepronexus.com", SIZE / 2, 990);

      // ── Tagline ────────────────────────────────────────────────────────────
      ctx.fillStyle = "#f97316";
      ctx.font = "500 30px -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif";
      ctx.fillText("Verified by Paper. Not by Algorithm.", SIZE / 2, 1036);

      // ── Download ───────────────────────────────────────────────────────────
      canvas.toBlob(blob => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a   = document.createElement("a");
        a.href     = url;
        a.download = `tradepro-${slug}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }, "image/png");

    } finally {
      setGenerating(false);
    }
  }, [slug, displayName, initials, trade, yearsExperience, locationCity, locationState,
      availabilityStatus, avatarUrl, unionMember, unionName, unionLocalNumber,
      certifications, legacyMember, earnedBadgeSlugs, isAvailable, profileUrl]);

  return (
    <>
      {/* Hidden canvas — used for rendering */}
      <canvas ref={canvasRef} className="hidden" />

      <div className="flex items-center gap-2">
        <button
          onClick={generateAndDownload}
          disabled={generating}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-60 text-white text-sm font-bold rounded-xl transition-colors"
        >
          {generating
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
            : <><Download className="w-4 h-4" /> Share My Trade Card</>
          }
        </button>
        <button
          onClick={copyLink}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold rounded-xl border transition-colors ${
            copied
              ? "bg-green-700/20 border-green-700/50 text-green-400"
              : "border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white"
          }`}
        >
          {copied ? <><Check className="w-4 h-4" /> Copied!</> : <><Link2 className="w-4 h-4" /> Copy Link</>}
        </button>
      </div>
    </>
  );
}

// ── Utility: rounded rect ─────────────────────────────────────────────────────
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
