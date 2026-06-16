"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { Menu, X, Search, Rss, ChevronDown, Shield } from "lucide-react";
import Image from "next/image";
import { getSupabase } from "@/lib/supabase";
import { AVAILABILITY_CONFIG } from "@/lib/constants";

type AvailStatus = "available" | "available_soon" | "booked";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [availability, setAvailability] = useState<AvailStatus | null>(null);
  const [profileSlug, setProfileSlug] = useState<string | null>(null);
  const [showAvailPicker, setShowAvailPicker] = useState(false);
  const [updatingAvail, setUpdatingAvail] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        (supabase as any)
          .from("profiles")
          .select("slug, availability_status")
          .eq("user_id", user.id)
          .single()
          .then(({ data }: any) => {
            if (data) {
              setAvailability(data.availability_status);
              setProfileSlug(data.slug ?? null);
            }
          });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) setAvailability(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Close picker on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowAvailPicker(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function updateAvailability(status: AvailStatus) {
    setUpdatingAvail(true);
    try {
      await fetch("/api/availability", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setAvailability(status);
    } finally {
      setUpdatingAvail(false);
      setShowAvailPicker(false);
    }
  }

  async function handleSignOut() {
    await getSupabase()?.auth.signOut();
    setUser(null);
    setAvailability(null);
    setProfileSlug(null);
    setOpen(false);
  }

  const availConfig = availability ? AVAILABILITY_CONFIG[availability] : null;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0f172a]/95 backdrop-blur-sm border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <Image src="/logo-mark.svg" alt="TradePro Nexus" width={32} height={32} className="rounded-lg" />
          <span className="font-semibold text-base tracking-tight leading-none">
            <span className="text-slate-100">TradePro</span>
            <span className="text-orange-400"> Nexus</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-4 text-sm font-medium">
          <Link href="/feed" className="flex items-center gap-1.5 text-slate-400 hover:text-orange-400 transition-colors">
            <Rss className="w-4 h-4" /> Live Feed
          </Link>
          <Link href="/search" className="flex items-center gap-1.5 text-slate-400 hover:text-orange-400 transition-colors">
            <Search className="w-4 h-4" /> Find Crews
          </Link>
          <Link href="/work" className="flex items-center gap-1.5 text-slate-400 hover:text-orange-400 transition-colors">
            Work Opportunities
          </Link>
          <Link href="/work#union" className="flex items-center gap-1.5 text-slate-400 hover:text-orange-400 transition-colors">
            <Shield className="w-4 h-4" /> Union Opportunities
          </Link>
          {/* Cross-property link to Resume Builder */}
          <a
            href="https://www.tradeprotech.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-slate-500 hover:text-slate-300 transition-colors text-xs border-l border-slate-700 pl-4"
          >
            Build Your Résumé → TradePro Tech
          </a>

          {user && availability && availConfig ? (
            /* Availability quick-update */
            <div className="relative" ref={pickerRef}>
              <button
                onClick={() => setShowAvailPicker(!showAvailPicker)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors ${availConfig.bg} ${availConfig.border} ${availConfig.color}`}
              >
                <span className={`w-2 h-2 rounded-full ${availConfig.dot} ${availability === "available" ? "animate-pulse" : ""}`} />
                {availConfig.label}
                <ChevronDown className={`w-3 h-3 transition-transform ${showAvailPicker ? "rotate-180" : ""}`} />
              </button>

              {showAvailPicker && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden z-50">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-3 pt-2.5 pb-1">Update Availability</p>
                  {(Object.entries(AVAILABILITY_CONFIG) as [AvailStatus, typeof AVAILABILITY_CONFIG["available"]][]).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => updateAvailability(key)}
                      disabled={updatingAvail}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold transition-colors hover:bg-slate-700/60 ${availability === key ? cfg.color : "text-slate-300"}`}
                    >
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                      {cfg.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {user ? (
            <>
              <Link href={profileSlug ? `/pro/${profileSlug}` : "/build"} className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-md transition-colors font-semibold">
                My Trade Card
              </Link>
              <button onClick={handleSignOut} className="px-4 py-2 border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white rounded-md transition-colors text-sm">
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link href="/build" className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-md transition-colors font-semibold">
                Build Trade Card
              </Link>
              <Link href="/login" className="px-4 py-2 border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white rounded-md transition-colors">
                Sign In
              </Link>
            </>
          )}
        </div>

        {/* Mobile Toggle */}
        <button onClick={() => setOpen(!open)} className="md:hidden p-2 -mr-2 text-slate-400 hover:text-white transition-colors">
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="md:hidden border-t border-slate-800 bg-[#0f172a] px-4 py-4 space-y-3">
          <Link href="/feed" onClick={() => setOpen(false)} className="flex items-center gap-2 text-slate-300 hover:text-orange-400 py-2 transition-colors">
            <Rss className="w-4 h-4" /> Live Feed
          </Link>
          <Link href="/search" onClick={() => setOpen(false)} className="flex items-center gap-2 text-slate-300 hover:text-orange-400 py-2 transition-colors">
            <Search className="w-4 h-4" /> Find Crews
          </Link>
          <Link href="/work" onClick={() => setOpen(false)} className="flex items-center gap-2 text-slate-300 hover:text-orange-400 py-2 transition-colors">
            Work Opportunities
          </Link>
          <Link href="/work#union" onClick={() => setOpen(false)} className="flex items-center gap-2 text-slate-300 hover:text-orange-400 py-2 transition-colors">
            <Shield className="w-4 h-4" /> Union Opportunities
          </Link>
          <a
            href="https://www.tradeprotech.ai"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-300 py-2 transition-colors text-xs border-t border-slate-800 pt-3"
          >
            Build Your Résumé → TradePro Tech ↗
          </a>

          {user && availability && availConfig && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Your Availability</p>
              <div className="flex gap-2 flex-wrap">
                {(Object.entries(AVAILABILITY_CONFIG) as [AvailStatus, typeof AVAILABILITY_CONFIG["available"]][]).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => updateAvailability(key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors ${
                      availability === key ? `${cfg.bg} ${cfg.border} ${cfg.color}` : "bg-slate-900 border-slate-700 text-slate-500"
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {user ? (
            <>
              <Link href={profileSlug ? `/pro/${profileSlug}` : "/build"} onClick={() => setOpen(false)} className="block w-full text-center py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-md font-semibold transition-colors">
                My Trade Card
              </Link>
              <button onClick={handleSignOut} className="block w-full text-center py-3 border border-slate-600 text-slate-300 rounded-md transition-colors">
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link href="/build" onClick={() => setOpen(false)} className="block w-full text-center py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-md font-semibold transition-colors">
                Build Trade Card
              </Link>
              <Link href="/login" onClick={() => setOpen(false)} className="block w-full text-center py-3 border border-slate-600 text-slate-300 rounded-md transition-colors">
                Sign In
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
