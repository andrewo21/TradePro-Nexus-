"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Mail, Ban, CheckCircle, AlertCircle } from "lucide-react";
import Navbar from "@/components/Navbar";

type Action = "unsubscribe" | "remove";

interface Lookup {
  businessName: string;
  sourceState: string;
  outreachEligible: boolean;
  removeRequested: boolean;
}

function UnsubscribeContent() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const action = (params.get("action") === "remove" ? "remove" : "unsubscribe") as Action;

  const [lookup, setLookup] = useState<Lookup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [alreadyRemoved, setAlreadyRemoved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("This link is missing a token.");
      setLoading(false);
      return;
    }
    fetch(`/api/registry/unsubscribe?token=${encodeURIComponent(token)}`)
      .then(res => res.json())
      .then(data => {
        if (data.alreadyRemoved) setAlreadyRemoved(true);
        else if (data.error) setError(data.error);
        else setLookup(data);
      })
      .catch(() => setError("Something went wrong looking up this listing."))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleConfirm() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/registry/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else if (data.alreadyRemoved) setAlreadyRemoved(true);
      else setDone(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const isRemove = action === "remove";

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <Navbar />
      <div className="max-w-md mx-auto px-4 pt-24 pb-20">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
          {loading ? (
            <div className="flex items-center gap-2 text-slate-400 py-8 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          ) : alreadyRemoved ? (
            <div className="text-center py-6">
              <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-3" />
              <h1 className="text-lg font-black text-white mb-2">You&apos;re already unsubscribed</h1>
              <p className="text-slate-400 text-sm">This listing has been removed from TradePro Nexus. You won&apos;t receive any further emails from us.</p>
            </div>
          ) : error ? (
            <div className="text-center py-6">
              <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
              <p className="text-slate-300 text-sm">{error}</p>
            </div>
          ) : done ? (
            <div className="text-center py-6">
              <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-3" />
              <h1 className="text-lg font-black text-white mb-2">
                {isRemove ? "Listing removed" : "You're unsubscribed"}
              </h1>
              <p className="text-slate-400 text-sm">
                {isRemove
                  ? `${lookup?.businessName ?? "This listing"} has been permanently removed from TradePro Nexus.`
                  : `${lookup?.businessName ?? "This listing"} will no longer receive outreach emails from TradePro Nexus.`}
              </p>
            </div>
          ) : (
            <div className="text-center">
              {isRemove ? (
                <Ban className="w-8 h-8 text-red-400 mx-auto mb-3" />
              ) : (
                <Mail className="w-8 h-8 text-orange-400 mx-auto mb-3" />
              )}
              <h1 className="text-lg font-black text-white mb-2">
                {isRemove ? "Remove this listing?" : "Unsubscribe from outreach emails?"}
              </h1>
              <p className="text-slate-400 text-sm mb-1">
                <span className="text-slate-200 font-semibold">{lookup?.businessName}</span> ({lookup?.sourceState})
              </p>
              <p className="text-slate-500 text-xs mb-6">
                {isRemove
                  ? "This will permanently delete this listing from TradePro Nexus's directory. This cannot be undone."
                  : "We'll stop sending emails about this listing. The listing itself will remain visible in the directory."}
              </p>
              <button
                onClick={handleConfirm}
                disabled={submitting}
                className={`w-full py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 ${
                  isRemove ? "bg-red-700 hover:bg-red-600 text-white" : "bg-orange-600 hover:bg-orange-500 text-white"
                }`}
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Working…</span>
                ) : isRemove ? "Remove My Listing" : "Unsubscribe"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense>
      <UnsubscribeContent />
    </Suspense>
  );
}
