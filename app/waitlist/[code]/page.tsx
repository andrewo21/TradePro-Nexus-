import { notFound } from "next/navigation";
import { CheckCircle, HardHat, Building2, ArrowRight } from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { getSupabaseAdmin } from "@/lib/supabaseServer";
import CopyButton from "@/components/CopyButton";

interface WaitlistRow {
  name: string;
  user_type: "pro" | "gc";
  position: number;
  referral_code: string;
  referred_by: string | null;
}

async function getReferralCount(referralCode: string): Promise<number> {
  const db = getSupabaseAdmin() as any;
  const { count } = await db
    .from("waitlist")
    .select("*", { count: "exact", head: true })
    .eq("referred_by", referralCode);
  return count ?? 0;
}

export default async function WaitlistConfirmPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const db = getSupabaseAdmin() as any;

  const { data: entry } = (await db
    .from("waitlist")
    .select("name, user_type, position, referral_code, referred_by")
    .eq("referral_code", code)
    .single()) as { data: WaitlistRow | null; error: unknown };

  if (!entry) notFound();

  const referralCount = await getReferralCount(code);
  const effectivePosition = Math.max(1, entry.position - referralCount);
  const isPro = entry.user_type === "pro";
  const firstName = entry.name.split(" ")[0];
  const referralLink = `https://tradepronexus.com/?ref=${entry.referral_code}`;

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <Navbar />
      <div className="max-w-lg mx-auto px-4 pt-24 pb-24">

        {/* Success header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-600/20 border border-green-600/40 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <h1 className="text-2xl font-black text-white mb-2">
            You&apos;re on the list{firstName ? `, ${firstName}` : ""}.
          </h1>
          <p className="text-slate-400 text-sm">
            {isPro
              ? "Your spot is reserved. We'll notify you the moment Trade Pros get early access."
              : "Your spot is reserved. First 50 GCs get the founder rate locked in forever."}
          </p>
        </div>

        {/* Position card */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 mb-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            {isPro
              ? <HardHat className="w-4 h-4 text-orange-400" />
              : <Building2 className="w-4 h-4 text-blue-400" />}
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
              {isPro ? "Trade Pro" : "General Contractor"}
            </span>
          </div>
          <p className="text-5xl font-black text-orange-400 mb-1">#{effectivePosition}</p>
          <p className="text-slate-400 text-sm">
            {referralCount > 0
              ? `on the waitlist — moved up ${referralCount} spot${referralCount !== 1 ? "s" : ""} from ${referralCount} referral${referralCount !== 1 ? "s" : ""}`
              : "on the waitlist"}
          </p>
        </div>

        {/* Referral card */}
        <div
          className={`rounded-2xl p-5 mb-4 border ${
            isPro
              ? "bg-orange-950/30 border-orange-900/50"
              : "bg-blue-950/30 border-blue-900/50"
          }`}
        >
          <h2 className="text-base font-black text-white mb-1">Move up the list</h2>
          <p className="text-slate-400 text-sm mb-4">
            Invite another {isPro ? "Trade Pro / Sub" : "GC or Developer"} using your link.
            Every signup moves you up one spot.
          </p>

          {/* Referral link display */}
          <div className="bg-slate-900/70 border border-slate-700 rounded-xl p-3 mb-3">
            <p className="text-xs text-slate-500 uppercase tracking-widest mb-1 font-semibold">Your referral link</p>
            <p className={`font-mono text-sm font-bold break-all ${isPro ? "text-orange-400" : "text-blue-400"}`}>
              {referralLink}
            </p>
          </div>

          {/* Share buttons */}
          <div className="flex gap-2">
            <CopyButton text={referralLink} />
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2.5 border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white rounded-xl text-xs font-semibold text-center transition-colors"
            >
              Share on LinkedIn
            </a>
            <a
              href={`sms:?body=${encodeURIComponent(`Just joined the TradePro Nexus waitlist — the verified marketplace for construction. Get your spot: ${referralLink}`)}`}
              className="flex-1 py-2.5 border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white rounded-xl text-xs font-semibold text-center transition-colors"
            >
              Text a Friend
            </a>
          </div>
        </div>

        {/* What happens next */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 mb-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">What happens next</h3>
          <div className="space-y-2.5">
            {(isPro
              ? [
                  "Check your email — confirmation + your referral link is on the way",
                  "Build your Digital Trade Card at any time",
                  "Early verification badge when we launch — verified before anyone else",
                ]
              : [
                  "Check your email — confirmation + your referral link is on the way",
                  "First 50 GCs lock in the founder rate forever",
                  "Full access to verified crew search at launch",
                ]
            ).map((item) => (
              <div key={item} className="flex items-start gap-2.5">
                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                <p className="text-slate-300 text-sm">{item}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Secondary actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/"
            className="flex-1 py-3 border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white font-semibold rounded-xl text-sm text-center transition-colors"
          >
            Back to Home
          </Link>
          {isPro && (
            <Link
              href="/build"
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-sm transition-colors"
            >
              Build My Trade Card <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>

      </div>
    </div>
  );
}

