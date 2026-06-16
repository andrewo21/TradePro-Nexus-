"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck, FileText, CheckCircle, ArrowRight, AlertCircle,
  HardHat, Loader2, Clock, Info
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import { canBeVerified, VERIFICATION_INELIGIBLE_MESSAGE } from "@/lib/constants";

// Required docs vary by profile type. Verification is only available to
// businesses and licensed professionals (sub, inspector, architect, engineer)
// — individual trade workers are never eligible (see canBeVerified).
// Subs: W9 + COI + bonding + executed agreement
// Inspectors, architects, engineers: W9 + COI + license copy (no bonding, no sub agreement)
const DOCS_BY_TYPE: Record<string, Array<{ key: string; label: string; desc: string }>> = {
  sub: [
    { key: "w9", label: "W9 Form", desc: "Valid EIN required — sole proprietors use SSN" },
    { key: "coi", label: "Certificate of Insurance (COI)", desc: "Must be current — expiration tracked automatically" },
    { key: "bonding", label: "Bonding Certificate", desc: "Capacity and bonding company extracted by AI" },
    { key: "agreement", label: "Executed Sub Agreement", desc: "Signed, dated, with dollar amount — from any project" },
  ],
  inspector: [
    { key: "w9", label: "W9 Form", desc: "Valid EIN required" },
    { key: "coi", label: "Certificate of Insurance (COI)", desc: "E&O and general liability — expiration tracked" },
    { key: "license", label: "License Copy", desc: "State inspector or ICC card — AI reads license number and expiration" },
  ],
  architect: [
    { key: "w9", label: "W9 Form", desc: "Valid EIN required" },
    { key: "coi", label: "Certificate of Insurance (COI)", desc: "E&O and general liability — expiration tracked" },
    { key: "license", label: "Architecture License", desc: "State license card or certificate — AI reads license number" },
  ],
  engineer: [
    { key: "w9", label: "W9 Form", desc: "Valid EIN required" },
    { key: "coi", label: "Certificate of Insurance (COI)", desc: "E&O and general liability — expiration tracked" },
    { key: "license", label: "PE License", desc: "PE stamp or license certificate — AI reads license number and state" },
  ],
};

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [profileType, setProfileType] = useState<string>("sub");
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const justPaid = searchParams.get("verification") === "pending";

  useEffect(() => {
    const supabase = getSupabase();
    supabase?.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setHasProfile(false); return; }
      const { data } = await (supabase as any)
        .from("profiles")
        .select("id, verification_status, profile_type")
        .eq("user_id", user.id)
        .single();
      setHasProfile(!!data);
      setVerificationStatus(data?.verification_status ?? null);
      if (data?.profile_type) setProfileType(data.profile_type);
    });
  }, []);

  async function handlePay() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout/verification", { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong."); return; }
      window.location.href = data.url;
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (justPaid || verificationStatus === "pending") {
    return (
      <div className="min-h-screen bg-[#0f172a] text-slate-100">
        <Navbar />
        <div className="max-w-lg mx-auto px-4 pt-24 pb-16 text-center">
          <div className="w-16 h-16 bg-orange-600/20 border border-orange-600/40 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-8 h-8 text-orange-400" />
          </div>
          <h1 className="text-2xl font-black text-white mb-2">Verification In Progress</h1>
          <p className="text-slate-400 mb-6">
            Your documents are being reviewed. AI checks run first — typically within minutes.
            Human review follows for anything flagged. You&apos;ll receive an email with the result.
          </p>
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 text-left space-y-2.5 mb-6">
            {["AI document scan (EIN, COI expiration, bonding)", "Project history consistency check", "Public web scan", "Reference survey sent to your contacts"].map(step => (
              <div key={step} className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                <span className="text-slate-300 text-sm">{step}</span>
              </div>
            ))}
          </div>
          <Link href="/build" className="inline-flex items-center gap-2 px-5 py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-sm transition-colors">
            Back to My Trade Card <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  if (hasProfile && !canBeVerified(profileType)) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-slate-100">
        <Navbar />
        <div className="max-w-lg mx-auto px-4 pt-24 pb-16 text-center">
          <div className="w-16 h-16 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center mx-auto mb-6">
            <Info className="w-8 h-8 text-slate-400" />
          </div>
          <h1 className="text-2xl font-black text-white mb-2">Verification Not Applicable</h1>
          <p className="text-slate-400 mb-6">{VERIFICATION_INELIGIBLE_MESSAGE}</p>
          <p className="text-slate-400 text-sm mb-6">
            As an individual trade pro, you can still earn engagement badges — Active Member, Community Pro, Verified Contributor, Profile Champion, and Networked — by staying active on the Live Feed and keeping your Trade Card complete.
          </p>
          <Link href="/build" className="inline-flex items-center gap-2 px-5 py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-sm transition-colors">
            Back to My Trade Card <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  if (verificationStatus === "verified") {
    return (
      <div className="min-h-screen bg-[#0f172a] text-slate-100">
        <Navbar />
        <div className="max-w-lg mx-auto px-4 pt-24 pb-16 text-center">
          <div className="w-16 h-16 bg-green-600/20 border border-green-600/40 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="w-8 h-8 text-green-400" />
          </div>
          <h1 className="text-2xl font-black text-white mb-2">Already Verified</h1>
          <p className="text-slate-400 mb-6">Your Trade Card carries the Verified Pro badge. You&apos;re visible to all GCs.</p>
          <Link href="/build" className="inline-flex items-center gap-2 px-5 py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-sm transition-colors">
            View My Trade Card <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-16">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-green-600/20 border border-green-600/40 rounded-xl flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Sub Verification — $99</h1>
            <p className="text-sm text-slate-400">One-time · Annual renewal · $79 refunded if denied</p>
          </div>
        </div>

        {/* What you get */}
        <div className="bg-gradient-to-br from-green-950/30 to-slate-900 border border-green-800/40 rounded-2xl p-5 mb-6">
          <h2 className="text-sm font-black text-white mb-3">What the Verified badge means</h2>
          <div className="space-y-2">
            {[
              "You appear in GC crew searches — unverified subs don't",
              "Your bonding, COI, and W9 are confirmed and tracked",
              "AI-extracted capacity and expiration data visible to GCs",
              "Public web scan — lawsuits, liens, OSHA, BBB checked",
              "References surveyed — 2 of 3 must respond",
              "Badge = eligible, not rated. No score, no grade, ever.",
            ].map(item => (
              <div key={item} className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                <p className="text-slate-300 text-sm">{item}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Required docs */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 mb-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-orange-400" /> Documents You&apos;ll Need
          </h2>
          <div className="space-y-3">
            {(DOCS_BY_TYPE[profileType] ?? DOCS_BY_TYPE.sub).map((doc) => (
              <div key={doc.key} className="flex items-start gap-3">
                <div className="w-6 h-6 bg-orange-600/20 border border-orange-600/40 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                  <FileText className="w-3.5 h-3.5 text-orange-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{doc.label}</p>
                  <p className="text-xs text-slate-400">{doc.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 bg-blue-950/30 border border-blue-800/40 rounded-xl p-3">
            <p className="text-xs text-blue-300 flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              Documents are uploaded on your Trade Card. Make sure those are uploaded before paying.
            </p>
          </div>
        </div>

        {/* Pricing breakdown */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-300 text-sm">Verification fee</span>
            <span className="text-white font-bold">$99.00</span>
          </div>
          <div className="flex items-center justify-between mb-3 text-xs text-slate-500">
            <span>Refunded if denied (processing fee kept)</span>
            <span className="text-green-400">$79.00 back</span>
          </div>
          <div className="border-t border-slate-700 pt-3 flex items-center justify-between">
            <span className="text-slate-300 text-sm font-semibold">Annual renewal</span>
            <span className="text-white font-bold">$99.00 / year</span>
          </div>
        </div>

        {/* Paywall if no profile */}
        {hasProfile === false && (
          <div className="bg-orange-950/30 border border-orange-800/40 rounded-xl p-4 mb-4 flex items-start gap-3">
            <HardHat className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-orange-300 font-semibold text-sm">Build your Trade Card first</p>
              <p className="text-slate-400 text-xs mt-0.5">Verification is tied to your Trade Card profile.</p>
              <Link href="/build" className="inline-flex items-center gap-1 text-orange-400 hover:text-orange-300 text-xs font-semibold mt-2 underline">
                Build Trade Card <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-950/40 border border-red-800/50 rounded-xl px-4 py-3 mb-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <button
          onClick={handlePay}
          disabled={loading || hasProfile === false || hasProfile === null}
          className="w-full flex items-center justify-center gap-2 py-4 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black rounded-2xl text-base transition-colors shadow-lg shadow-green-900/30"
        >
          {loading
            ? <><Loader2 className="w-5 h-5 animate-spin" /> Redirecting to payment…</>
            : <><ShieldCheck className="w-5 h-5" /> Pay $99 — Start Verification</>
          }
        </button>

        <p className="text-center text-xs text-slate-600 mt-3">
          Verified by Paper. Not by Algorithm. · Secure payment via Stripe.
        </p>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyContent />
    </Suspense>
  );
}
