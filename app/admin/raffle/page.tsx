"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Gift, Trophy, Mail } from "lucide-react";
import Navbar from "@/components/Navbar";
import { getSupabase } from "@/lib/supabase";

const ADMIN_EMAIL = "andrew@tradeprotech.ai";

type Entrant = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  referral_code: string | null;
  referral_count: number;
  entered_at: string;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function AdminRafflePage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [entrants, setEntrants] = useState<Entrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [picking, setPicking] = useState(false);
  const [winner, setWinner] = useState<Entrant | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);

  const fetchEntrants = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/raffle/entrants");
    if (res.ok) {
      const data = await res.json();
      setEntrants(data.entrants ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const db = getSupabase();
    db?.auth.getUser().then(({ data: { user } }) => {
      if (user?.email === ADMIN_EMAIL) {
        setAuthorized(true);
        fetchEntrants();
      } else {
        setAuthorized(false);
        setLoading(false);
      }
    });
  }, [fetchEntrants]);

  async function pickWinner() {
    setPicking(true);
    setPickError(null);
    setWinner(null);
    try {
      const res = await fetch("/api/admin/raffle/pick-winner", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setPickError(data.error ?? "Could not pick a winner.");
        return;
      }
      setWinner(data.winner);
    } catch {
      setPickError("Network error. Please try again.");
    } finally {
      setPicking(false);
    }
  }

  if (authorized === false) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-slate-100 flex items-center justify-center">
        <p className="text-slate-400">Not authorized.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 pt-24 pb-16">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-orange-600/20 border border-orange-600/40 rounded-xl flex items-center justify-center">
            <Gift className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Milwaukee M18 Raffle</h1>
            <p className="text-sm text-slate-400">Qualified entrants · Drawing August 1st</p>
          </div>
        </div>

        {loading || authorized === null ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <p className="text-slate-400 text-sm">
                <span className="text-white font-bold">{entrants.length}</span> qualified {entrants.length === 1 ? "entrant" : "entrants"}
              </p>
              <button
                onClick={pickWinner}
                disabled={picking || entrants.length === 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white font-bold rounded-xl text-sm transition-colors"
              >
                {picking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
                Pick Winner
              </button>
            </div>

            {pickError && (
              <div className="bg-red-950/40 border border-red-800/50 text-red-400 text-sm rounded-xl px-4 py-3 mb-6">
                {pickError}
              </div>
            )}

            {winner && (
              <div className="bg-gradient-to-br from-amber-950/60 to-slate-900 border border-amber-700/60 rounded-2xl p-6 mb-6 text-center">
                <Trophy className="w-8 h-8 text-amber-400 mx-auto mb-3" />
                <p className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-1">Winner Selected</p>
                <p className="text-white font-black text-xl mb-1">
                  {[winner.first_name, winner.last_name].filter(Boolean).join(" ") || "Unnamed entrant"}
                </p>
                <p className="text-slate-400 text-sm flex items-center justify-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> {winner.email ?? "No email on file"}
                </p>
              </div>
            )}

            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-left text-xs text-slate-500 uppercase tracking-widest">
                    <th className="px-4 py-3 font-bold">Name</th>
                    <th className="px-4 py-3 font-bold">Email</th>
                    <th className="px-4 py-3 font-bold">Referrals</th>
                    <th className="px-4 py-3 font-bold">Entry Date</th>
                  </tr>
                </thead>
                <tbody>
                  {entrants.map(e => (
                    <tr key={e.user_id} className="border-b border-slate-800 last:border-0">
                      <td className="px-4 py-3 text-white font-semibold">
                        {[e.first_name, e.last_name].filter(Boolean).join(" ") || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-400">{e.email ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-400">{e.referral_count}</td>
                      <td className="px-4 py-3 text-slate-500">{formatDate(e.entered_at)}</td>
                    </tr>
                  ))}
                  {entrants.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-500">No qualified entrants yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
