"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Briefcase, MapPin, HardHat, Building2, ArrowRight,
  CheckCircle, Loader2, Bell
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Link from "next/link";

const COMING_FEATURES = [
  "Browse local and national construction job postings",
  "Apply directly through your Digital Trading Card",
  "GCs post opportunities visible to verified pros first",
  "Filter by trade, location, project type, and pay structure",
  "Direct hire and sub-contract opportunities",
  "Available Now status wires directly into job matching",
];

export default function WorkPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [userType, setUserType] = useState<"pro" | "gc" | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userType) { setError("Select whether you're a Trade Pro or GC."); return; }
    if (!name.trim() || !email.trim()) { setError("Name and email are required."); return; }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          user_type: userType,
          source: "work_opportunities",
        }),
      });
      const data = await res.json();
      if (!res.ok && res.status !== 409) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setDone(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-20">

        {/* Label */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-2 mb-6"
        >
          <span className="flex items-center gap-1.5 px-3 py-1 bg-orange-950/60 border border-orange-800/50 text-orange-400 text-xs font-bold rounded-full uppercase tracking-wider">
            <Bell className="w-3 h-3" /> Coming Soon
          </span>
        </motion.div>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-black text-white mb-4 leading-tight">
            Work Opportunities —<br />
            <span className="text-orange-400">Coming to TradePro Nexus.</span>
          </h1>
          <p className="text-slate-300 text-lg leading-relaxed">
            Trade pros will be able to browse and apply for local and national
            construction opportunities directly on TradePro Nexus — matched to
            your trade, location, and verified credentials. No job boards.
            No middlemen.
          </p>
        </motion.div>

        {/* Feature preview */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-slate-800 border border-slate-600 rounded-2xl p-5 mb-8"
        >
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">
            What&apos;s coming
          </h2>
          <div className="space-y-2.5">
            {COMING_FEATURES.map(f => (
              <div key={f} className="flex items-start gap-2.5">
                <CheckCircle className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                <p className="text-slate-300 text-sm">{f}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Email capture */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="bg-gradient-to-br from-orange-950/30 to-slate-900 border border-orange-800/40 rounded-2xl p-6"
        >
          {done ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-green-600/20 border border-green-600/40 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-lg font-black text-white mb-2">You&apos;re on the list.</h3>
              <p className="text-slate-400 text-sm">
                We&apos;ll notify you the moment Work Opportunities goes live.
              </p>
              <Link
                href="/build"
                className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-sm transition-colors"
              >
                Build Your Trading Card While You Wait <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-black text-white mb-1">
                Get notified when it launches.
              </h2>
              <p className="text-slate-400 text-sm mb-5">
                Be first in line — we&apos;ll notify you before the public launch.
              </p>

              <form onSubmit={handleSubmit} className="space-y-3">
                {/* User type */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setUserType("pro")}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold border transition-colors ${
                      userType === "pro"
                        ? "bg-orange-600 border-orange-500 text-white"
                        : "bg-slate-800 border-slate-600 text-slate-400 hover:border-orange-600/50"
                    }`}
                  >
                    <HardHat className="w-4 h-4" /> Trade Pro
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserType("gc")}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold border transition-colors ${
                      userType === "gc"
                        ? "bg-blue-700 border-blue-600 text-white"
                        : "bg-slate-800 border-slate-600 text-slate-400 hover:border-blue-600/50"
                    }`}
                  >
                    <Building2 className="w-4 h-4" /> GC / Developer
                  </button>
                </div>

                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your full name"
                  required
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-orange-500 transition-colors"
                />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-orange-500 transition-colors"
                />

                {error && <p className="text-red-400 text-sm">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-black rounded-xl text-sm transition-colors"
                >
                  {loading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                    : <><Bell className="w-4 h-4" /> Notify Me When It Launches</>
                  }
                </button>
                <p className="text-center text-xs text-slate-600">
                  Free. No spam. One email when it&apos;s live.
                </p>
              </form>
            </>
          )}
        </motion.div>

        {/* Secondary CTA */}
        <p className="text-center text-sm text-slate-500 mt-8">
          Already on the platform?{" "}
          <Link href="/build" className="text-orange-400 hover:text-orange-300 transition-colors font-semibold">
            Complete your Trading Card
          </Link>{" "}
          so you&apos;re ready when opportunities go live.
        </p>

      </div>
    </div>
  );
}
