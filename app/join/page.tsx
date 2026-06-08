"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { HardHat, Building2, ArrowRight, Loader2, CheckCircle, ShieldCheck, Search, Zap } from "lucide-react";

function JoinForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const source = searchParams.get("source") ?? null;

  const [userType, setUserType] = useState<"pro" | "gc" | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [referralCode, setReferralCode] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userType) { setError("Select Trade Pro or GC first."); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), user_type: userType, source }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong."); return; }
      setReferralCode(data.referral_code);
      setDone(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="text-center">
        <div className="w-20 h-20 bg-green-600/20 border-2 border-green-500/50 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-400" />
        </div>
        <h2 className="text-3xl font-black text-white mb-3">You&apos;re in!</h2>
        <p className="text-slate-300 text-lg mb-2">We&apos;ll send your invite when we open the doors.</p>
        <p className="text-slate-500 text-sm mb-8">Check your email — confirmation on the way.</p>
        <button
          onClick={() => router.push("/")}
          className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-2xl text-sm transition-colors"
        >
          Learn More About TradePro Nexus <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Logo / Brand */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-orange-600/20 border border-orange-600/40 rounded-full px-4 py-1.5 mb-6">
          <Zap className="w-3.5 h-3.5 text-orange-400" />
          <span className="text-orange-400 text-xs font-bold uppercase tracking-widest">Free to Join</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight mb-4">
          Join TradePro Nexus<br />
          <span className="text-orange-500">Free</span>
        </h1>
        <p className="text-slate-300 text-lg leading-relaxed max-w-sm mx-auto">
          Build your Trade Card, get verified, get found by GCs.
        </p>
      </div>

      {/* Value props */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { icon: HardHat, label: "Trade Card", sub: "Your digital credential" },
          { icon: ShieldCheck, label: "Get Verified", sub: "Stand out to GCs" },
          { icon: Search, label: "Get Found", sub: "By $30M+ GCs" },
        ].map(({ icon: Icon, label, sub }) => (
          <div key={label} className="bg-slate-800/60 border border-slate-700 rounded-2xl p-3 text-center">
            <Icon className="w-5 h-5 text-orange-400 mx-auto mb-1.5" />
            <p className="text-white text-xs font-bold leading-tight">{label}</p>
            <p className="text-slate-500 text-[10px] mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type selector */}
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 text-center">I am a…</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setUserType("pro")}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm border-2 transition-all ${
                userType === "pro"
                  ? "bg-orange-600 border-orange-500 text-white shadow-lg shadow-orange-900/40"
                  : "bg-slate-800/60 border-slate-700 text-slate-400 hover:border-orange-600/50"
              }`}
            >
              <HardHat className="w-4 h-4" /> Trade Pro / Sub
            </button>
            <button
              type="button"
              onClick={() => setUserType("gc")}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm border-2 transition-all ${
                userType === "gc"
                  ? "bg-blue-700 border-blue-600 text-white shadow-lg shadow-blue-900/40"
                  : "bg-slate-800/60 border-slate-700 text-slate-400 hover:border-blue-600/50"
              }`}
            >
              <Building2 className="w-4 h-4" /> GC / Developer
            </button>
          </div>
        </div>

        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your full name"
          required
          autoComplete="name"
          className="w-full bg-slate-800/60 border-2 border-slate-700 focus:border-orange-500 rounded-2xl px-4 py-3.5 text-base text-white placeholder-slate-500 focus:outline-none transition-colors"
        />
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          autoComplete="email"
          inputMode="email"
          className="w-full bg-slate-800/60 border-2 border-slate-700 focus:border-orange-500 rounded-2xl px-4 py-3.5 text-base text-white placeholder-slate-500 focus:outline-none transition-colors"
        />

        {error && (
          <div className="bg-red-950/40 border border-red-800/50 text-red-400 text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-4 bg-orange-600 hover:bg-orange-500 active:bg-orange-700 disabled:opacity-50 text-white font-black rounded-2xl text-lg transition-colors shadow-xl shadow-orange-900/30"
        >
          {loading
            ? <><Loader2 className="w-5 h-5 animate-spin" /> Reserving your spot…</>
            : <><span>Join Free</span><ArrowRight className="w-5 h-5" /></>
          }
        </button>

        <p className="text-center text-xs text-slate-600">
          No credit card. No subscription. Free forever.
        </p>
      </form>
    </>
  );
}

export default function JoinPage() {
  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col">
      {/* Minimal header */}
      <div className="flex items-center justify-center py-6 px-4 border-b border-slate-800/60">
        <span className="text-white font-black text-lg tracking-tight">
          TradePro<span className="text-orange-500"> Nexus</span>
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <Suspense fallback={null}>
            <JoinForm />
          </Suspense>
        </div>
      </div>

      {/* Minimal footer */}
      <div className="py-6 px-4 text-center border-t border-slate-800/60">
        <p className="text-slate-600 text-xs">
          TradePro Nexus · Verified by Paper. Not by Algorithm.
        </p>
      </div>
    </div>
  );
}
