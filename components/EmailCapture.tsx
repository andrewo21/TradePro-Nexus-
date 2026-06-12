"use client";

import { useState } from "react";
import { HardHat, Building2, CheckCircle, Loader2, Bell } from "lucide-react";

interface Props {
  source: string;
  fixedUserType?: "pro" | "gc";
  title: string;
  subtitle: string;
  buttonLabel: string;
  successTitle: string;
  successBody: string;
}

// Reusable waitlist email capture form — posts to /api/waitlist with a
// caller-supplied `source` tag so signups can be segmented by funnel.
export default function EmailCapture({
  source, fixedUserType, title, subtitle, buttonLabel, successTitle, successBody,
}: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [userType, setUserType] = useState<"pro" | "gc" | null>(fixedUserType ?? null);
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
          source,
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

  if (done) {
    return (
      <div className="text-center py-4">
        <div className="w-12 h-12 bg-green-600/20 border border-green-600/40 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-6 h-6 text-green-400" />
        </div>
        <h3 className="text-lg font-black text-white mb-2">{successTitle}</h3>
        <p className="text-slate-400 text-sm">{successBody}</p>
      </div>
    );
  }

  return (
    <>
      <h2 className="text-lg font-black text-white mb-1">{title}</h2>
      <p className="text-slate-400 text-sm mb-5">{subtitle}</p>

      <form onSubmit={handleSubmit} className="space-y-3">
        {!fixedUserType && (
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
        )}

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
            : <><Bell className="w-4 h-4" /> {buttonLabel}</>
          }
        </button>
        <p className="text-center text-xs text-slate-600">
          Free. No spam. One email when it&apos;s live.
        </p>
      </form>
    </>
  );
}
