"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { HardHat, Building2, ArrowRight, Loader2 } from "lucide-react";

interface Props {
  compact?: boolean;
  onSuccess?: (code: string) => void;
}

export default function WaitlistForm({ compact = false, onSuccess }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [userType, setUserType] = useState<"pro" | "gc" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [referredBy, setReferredBy] = useState<string | null>(null);

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) setReferredBy(ref);
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userType) { setError("Please select Trade Pro or GC."); return; }
    if (!name.trim()) { setError("Please enter your name."); return; }
    if (!email.trim()) { setError("Please enter your email."); return; }

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
          referred_by: referredBy,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      if (onSuccess) {
        onSuccess(data.referral_code);
      } else {
        router.push(`/waitlist/${data.referral_code}`);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (compact) {
    return (
      <form onSubmit={handleSubmit} className="space-y-2">
        {/* User type */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setUserType("pro")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold border transition-colors ${
              userType === "pro"
                ? "bg-orange-600 border-orange-500 text-white"
                : "bg-slate-800 border-slate-600 text-slate-400 hover:border-orange-600/50"
            }`}
          >
            <HardHat className="w-3.5 h-3.5" /> Trade Pro
          </button>
          <button
            type="button"
            onClick={() => setUserType("gc")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold border transition-colors ${
              userType === "gc"
                ? "bg-blue-700 border-blue-600 text-white"
                : "bg-slate-800 border-slate-600 text-slate-400 hover:border-blue-600/50"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" /> GC
          </button>
        </div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          required
          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
        />
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="btn-glow w-full flex items-center justify-center gap-2 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold rounded-lg text-sm"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Get Early Access</span><ArrowRight className="w-4 h-4" /></>}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto space-y-3">
      {/* User type selector */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 text-center">I am a…</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setUserType("pro")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm border transition-all ${
              userType === "pro"
                ? "bg-orange-600 border-orange-500 text-white shadow-lg shadow-orange-900/30"
                : "bg-slate-800/70 border-slate-600 text-slate-400 hover:border-orange-600/50 hover:text-slate-200"
            }`}
          >
            <HardHat className="w-4 h-4" /> Trade Pro / Sub
          </button>
          <button
            type="button"
            onClick={() => setUserType("gc")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm border transition-all ${
              userType === "gc"
                ? "bg-blue-700 border-blue-600 text-white shadow-lg shadow-blue-900/30"
                : "bg-slate-800/70 border-slate-600 text-slate-400 hover:border-blue-600/50 hover:text-slate-200"
            }`}
          >
            <Building2 className="w-4 h-4" /> GC / Developer
          </button>
        </div>
      </div>

      {/* Fields */}
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your full name"
        required
        className="w-full bg-slate-800/70 border border-slate-600 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
      />
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        required
        className="w-full bg-slate-800/70 border border-slate-600 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
      />

      {error && (
        <p className="text-red-400 text-sm text-center">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="btn-glow w-full flex items-center justify-center gap-2 py-3.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-black rounded-xl text-base shadow-lg shadow-orange-900/30"
      >
        {loading
          ? <><Loader2 className="w-5 h-5 animate-spin" /> Reserving your spot…</>
          : <><span>Get Early Access — It&apos;s Free</span><ArrowRight className="w-5 h-5" /></>
        }
      </button>

      <p className="text-center text-xs text-slate-600">
        No credit card. No subscription. Free forever.
      </p>
    </form>
  );
}
