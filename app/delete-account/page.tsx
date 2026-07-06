"use client";

import { useState } from "react";
import { Mail, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";

export default function DeleteAccountPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else setDone(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <Navbar />
      <div className="max-w-md mx-auto px-4 pt-24 pb-20">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
          {done ? (
            <div className="text-center py-6">
              <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-3" />
              <h1 className="text-lg font-black text-white mb-2">Request received</h1>
              <p className="text-slate-400 text-sm">
                Your request has been received. We will delete your account and associated data
                within 30 days.
              </p>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <Mail className="w-8 h-8 text-orange-400 mx-auto mb-3" />
                <h1 className="text-lg font-black text-white mb-2">Delete Your Account</h1>
                <p className="text-slate-400 text-sm">
                  You can request deletion of your TradePro Nexus account and all associated data.
                  Submit your request below and we will process it within 30 days.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-400 text-xs">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 rounded-xl text-sm font-bold bg-orange-600 hover:bg-orange-500 text-white transition-colors disabled:opacity-50"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Submitting
                    </span>
                  ) : (
                    "Submit Deletion Request"
                  )}
                </button>
              </form>

              <p className="text-slate-500 text-xs mt-6 pt-6 border-t border-slate-700/50">
                If you have a claimed profile you can also remove it instantly by logging in and
                selecting Remove My Listing from your profile settings.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
