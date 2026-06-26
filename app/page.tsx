"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  HardHat,
  Search,
  CheckCircle,
  Zap,
  ShieldCheck,
  Building2,
  Shield,
  Rss,
  Menu,
  X,
} from "lucide-react";

// ── Inline SVG logo ───────────────────────────────────────────────────────────

function TrussLogo({ className }: { className?: string }) {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 52 52"
      fill="none"
      className={className}
    >
      <rect width="52" height="52" rx="10" fill="#0f172a" />
      <path
        d="M12 38 L26 14 L40 38"
        stroke="#f1f5f9"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M17 30 L35 30"
        stroke="#f1f5f9"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="26" cy="38" r="3.5" fill="#f97316" />
      <path
        d="M22 14 L30 14"
        stroke="#f97316"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [directoryCount, setDirectoryCount] = useState(0);
  const [legacyCount, setLegacyCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d) => {
        setDirectoryCount(d.directoryListings ?? 0);
        setLegacyCount(d.legacyMemberCount ?? 0);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen">

      {/* ── NAVBAR ──────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-[#e2e8f0] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <TrussLogo />
            <span className="text-[#0f172a] font-black text-base leading-none">
              TradePro<span className="text-[#f97316]"> Nexus</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/search"
              className="text-[#64748b] hover:text-[#0f172a] text-sm font-semibold transition-colors"
            >
              Find Crews
            </Link>
            <Link
              href="/feed"
              className="text-[#64748b] hover:text-[#0f172a] text-sm font-semibold transition-colors"
            >
              Live Feed
            </Link>
            <Link
              href="/work"
              className="text-[#64748b] hover:text-[#0f172a] text-sm font-semibold transition-colors"
            >
              Work Opportunities
            </Link>
          </nav>

          {/* Desktop buttons */}
          <div className="hidden md:flex items-center gap-3">
            <a
              href="https://www.tradeprotech.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[#64748b] hover:text-[#0f172a] text-sm font-semibold transition-colors border-r border-[#e2e8f0] pr-3"
            >
              <span className="text-[#f97316]">&#128196;</span> Resume Builder
            </a>
            <Link
              href="/login"
              className="border border-[#e2e8f0] text-[#475569] hover:border-[#cbd5e1] rounded-xl px-4 py-2 text-sm font-semibold transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="bg-[#f97316] text-white rounded-xl px-4 py-2 text-sm font-bold hover:bg-[#ea6c00] transition-colors"
            >
              Join Free
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 text-[#475569]"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-[#e2e8f0] bg-white px-4 py-4 space-y-3">
            <Link
              href="/search"
              className="block text-[#64748b] hover:text-[#0f172a] text-sm font-semibold py-1"
              onClick={() => setMobileOpen(false)}
            >
              Find Crews
            </Link>
            <Link
              href="/feed"
              className="block text-[#64748b] hover:text-[#0f172a] text-sm font-semibold py-1"
              onClick={() => setMobileOpen(false)}
            >
              Live Feed
            </Link>
            <Link
              href="/work"
              className="block text-[#64748b] hover:text-[#0f172a] text-sm font-semibold py-1"
              onClick={() => setMobileOpen(false)}
            >
              Work Opportunities
            </Link>
            <div className="flex flex-col gap-2 pt-2">
              <Link
                href="/login"
                className="border border-[#e2e8f0] text-[#475569] rounded-xl px-4 py-2 text-sm font-semibold text-center"
                onClick={() => setMobileOpen(false)}
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="bg-[#f97316] text-white rounded-xl px-4 py-2 text-sm font-bold text-center hover:bg-[#ea6c00] transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                Join Free
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section className="bg-[#0f172a] py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center bg-[#1e293b] border border-[#f97316]/40 text-[#f97316] text-xs font-bold px-3 py-1.5 rounded-full mb-6">
            Now Live in 7 States
          </div>

          {/* H1 */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight mb-4">
            <span className="text-white">The verified marketplace for </span>
            <span className="text-[#f97316]">construction professionals.</span>
          </h1>

          {/* Subheadline */}
          <p className="text-[#94a3b8] text-lg md:text-xl max-w-2xl mx-auto text-center mt-4 mb-8">
            Build your free Trade Card. Get discovered by GCs. Connect with the
            trades. Built by a 30-year construction veteran.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
            <Link
              href="/build"
              className="w-full sm:w-auto inline-flex items-center justify-center bg-[#f97316] hover:bg-[#ea6c00] text-white font-black px-8 py-4 rounded-xl text-base transition-colors"
            >
              Build My Trade Card -- Free
            </Link>
            <Link
              href="/search"
              className="w-full sm:w-auto inline-flex items-center justify-center border border-[#334155] hover:border-[#475569] text-[#94a3b8] hover:text-white font-bold px-8 py-4 rounded-xl text-base transition-colors"
            >
              Find Contractors
            </Link>
          </div>

          {/* Legacy Member counter */}
          {legacyCount !== null && (
            <div className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full mb-8 text-sm font-bold border ${
              legacyCount >= 100
                ? "bg-slate-800/60 border-slate-700 text-slate-400"
                : "bg-amber-950/40 border-amber-700/60 text-amber-300"
            }`}>
              <span className="text-base">🏅</span>
              {legacyCount >= 100
                ? "Legacy spots are full — verification discount still available via referrals."
                : `${100 - legacyCount} of 100 Legacy spots remaining — free verification for life. Sign up and post once.`}
            </div>
          )}

          {/* Stat boxes */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#1e293b] border border-[#334155] rounded-2xl p-6 text-center">
              <p className="text-3xl font-black text-white mb-1">
                {directoryCount > 0
                  ? `${directoryCount.toLocaleString()}+`
                  : "500,000+"}
              </p>
              <p className="text-[#64748b] text-sm">Licensed contractors listed</p>
            </div>
            <div className="bg-[#1e293b] border border-[#334155] rounded-2xl p-6 text-center">
              <p className="text-3xl font-black text-[#f97316] mb-1">7</p>
              <p className="text-[#64748b] text-sm">States covered</p>
            </div>
            <div className="bg-[#1e293b] border border-[#334155] rounded-2xl p-6 text-center">
              <p className="text-3xl font-black text-white mb-1">Free</p>
              <p className="text-[#64748b] text-sm">Always free to join</p>
            </div>
            <div className="bg-[#1e293b] border border-[#334155] rounded-2xl p-6 text-center">
              <p className="text-3xl font-black text-[#f97316] mb-1">5 min</p>
              <p className="text-[#64748b] text-sm">To build your Trade Card</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── ORANGE TAGLINE STRIP ─────────────────────────────────────────────── */}
      <div className="bg-[#f97316] py-4 px-4 text-center">
        <p className="text-[#0f172a] font-black text-lg tracking-tight">
          Verified by Paper. Not by Algorithm.
        </p>
      </div>

      {/* ── TWO COLUMN FEATURES ──────────────────────────────────────────────── */}
      <section className="bg-white py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-[#0f172a] font-black text-3xl text-center mb-12">
            Built for every side of the job site
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Left column -- Trade Professionals */}
            <div className="border border-[#e2e8f0] rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <HardHat className="w-6 h-6 text-[#f97316]" />
                <h3 className="text-[#0f172a] font-black text-xl">
                  For Trade Professionals
                </h3>
              </div>
              <p className="text-[#64748b] text-sm mb-5">
                Get your digital identity on the platform GCs actually use.
              </p>
              <div className="space-y-3">
                <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl p-5">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-[#f97316] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[#0f172a] font-bold text-sm mb-1">
                        Free Trade Card
                      </p>
                      <p className="text-[#64748b] text-sm leading-relaxed">
                        Build your digital profile with trade, certs, crew size,
                        and availability. Yours to keep forever.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl p-5">
                  <div className="flex items-start gap-3">
                    <Zap className="w-5 h-5 text-[#f97316] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[#0f172a] font-bold text-sm mb-1">
                        Available for Work Toggle
                      </p>
                      <p className="text-[#64748b] text-sm leading-relaxed">
                        One tap to tell the entire network you are open for new
                        opportunities.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl p-5">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-[#f97316] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[#0f172a] font-bold text-sm mb-1">
                        Verification Badge -- Coming Soon
                      </p>
                      <p className="text-[#64748b] text-sm leading-relaxed">
                        Verifiable credentials for GCs who need proof before
                        they call.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right column -- General Contractors */}
            <div className="border border-[#e2e8f0] rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <Building2 className="w-6 h-6 text-[#f97316]" />
                <h3 className="text-[#0f172a] font-black text-xl">
                  For General Contractors
                </h3>
              </div>
              <p className="text-[#64748b] text-sm mb-5">
                Stop calling buddies. Search 500,000+ verified contractors by
                trade, state, and availability.
              </p>
              <div className="space-y-3">
                <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl p-5">
                  <div className="flex items-start gap-3">
                    <Search className="w-5 h-5 text-[#f97316] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[#0f172a] font-bold text-sm mb-1">
                        Search 500,000+ Contractors
                      </p>
                      <p className="text-[#64748b] text-sm leading-relaxed">
                        Filter by trade, state, city, union status, and
                        availability. Real people. Real licenses.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl p-5">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-[#f97316] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[#0f172a] font-bold text-sm mb-1">
                        Union Features Built In
                      </p>
                      <p className="text-[#64748b] text-sm leading-relaxed">
                        Search union-only crews, filter by prevailing wage and
                        Davis-Bacon certification.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl p-5">
                  <div className="flex items-start gap-3">
                    <Rss className="w-5 h-5 text-[#f97316] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[#0f172a] font-bold text-sm mb-1">
                        Live Industry Feed
                      </p>
                      <p className="text-[#64748b] text-sm leading-relaxed">
                        Stay current on materials, labor market conditions, and
                        what crews are saying from the field.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────────── */}
      <section className="bg-[#0f172a] py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-white font-black text-3xl text-center mb-12">
            How it works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-[#f97316] flex items-center justify-center text-white font-black text-xl mx-auto mb-4">
                1
              </div>
              <h3 className="font-black text-white text-lg mb-2">
                Sign up free
              </h3>
              <p className="text-[#94a3b8] text-sm leading-relaxed">
                No credit card. No subscription. Takes 60 seconds and your
                account is yours permanently.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-[#f97316] flex items-center justify-center text-white font-black text-xl mx-auto mb-4">
                2
              </div>
              <h3 className="font-black text-white text-lg mb-2">
                Build your Trade Card
              </h3>
              <p className="text-[#94a3b8] text-sm leading-relaxed">
                Add your trade, licenses, certifications, crew size, and union
                status. Your profile goes live immediately.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-[#f97316] flex items-center justify-center text-white font-black text-xl mx-auto mb-4">
                3
              </div>
              <h3 className="font-black text-white text-lg mb-2">
                Get discovered or start searching
              </h3>
              <p className="text-[#94a3b8] text-sm leading-relaxed">
                GCs find you by trade and location. Or search 500,000+ licensed
                contractors yourself.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA SECTION ──────────────────────────────────────────────────────── */}
      <section className="bg-[#f97316] py-20 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <p className="text-[#0f172a] font-black text-3xl md:text-4xl">
            The construction industry built this country.
          </p>
          <p className="text-[#0f172a] font-black text-3xl md:text-4xl mt-2 mb-8">
            It deserves a platform built for it.
          </p>
          <Link
            href="/signup"
            className="inline-block bg-[#0f172a] text-white hover:bg-[#1e293b] font-black px-10 py-4 rounded-xl text-lg transition-colors"
          >
            Join Free Today
          </Link>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <footer className="bg-[#0f172a] border-t border-[#1e293b] py-10 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid sm:grid-cols-2 gap-8 mb-8">
            <div>
              <Link href="/" className="flex items-center gap-2 mb-3">
                <TrussLogo />
                <span className="text-white font-black text-base leading-none">
                  TradePro<span className="text-[#f97316]"> Nexus</span>
                </span>
              </Link>
              <p className="text-[#475569] text-sm">
                Verified by Paper. Not by Algorithm.
              </p>
            </div>
            <div>
              <p className="text-[#64748b] text-xs font-bold uppercase tracking-widest mb-3">
                Quick Links
              </p>
              <div className="space-y-2">
                <Link
                  href="/search"
                  className="block text-[#475569] hover:text-[#94a3b8] text-sm transition-colors"
                >
                  Find Crews
                </Link>
                <Link
                  href="/feed"
                  className="block text-[#475569] hover:text-[#94a3b8] text-sm transition-colors"
                >
                  Live Feed
                </Link>
                <Link
                  href="/work"
                  className="block text-[#475569] hover:text-[#94a3b8] text-sm transition-colors"
                >
                  Work Opportunities
                </Link>
                <Link
                  href="/build"
                  className="block text-[#475569] hover:text-[#94a3b8] text-sm transition-colors"
                >
                  Build Trade Card
                </Link>
                <Link
                  href="/login"
                  className="block text-[#475569] hover:text-[#94a3b8] text-sm transition-colors"
                >
                  Sign In
                </Link>
              </div>
            </div>
          </div>

          <div className="border-t border-[#1e293b] pt-6 mt-8 text-center">
            <p className="text-[#334155] text-xs">
              TradePro Technologies LLC
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
