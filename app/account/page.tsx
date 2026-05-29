import { notFound } from "next/navigation";
import { ShieldCheck, Building2, Users, Calendar, Star, AlertCircle, CheckCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { getSupabaseServer, getSupabaseAdmin } from "@/lib/supabaseServer";
import { GC_TIERS, FOUNDER_LIMIT, type GCTier } from "@/lib/stripe-config";

interface GCSubRow {
  id: string;
  tier: GCTier;
  status: string;
  is_founder: boolean;
  seat_limit: number | null;
  seats_used: number;
  trial_ends_at: string | null;
  current_period_end: string | null;
  canceled_at: string | null;
  created_at: string;
}

interface VerificationRow {
  status: string;
  amount_paid: number;
  amount_refunded: number;
  created_at: string;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string; border: string }> = {
    trialing:   { label: "Free Trial",   color: "text-blue-400",   bg: "bg-blue-900/30",   border: "border-blue-800/50" },
    active:     { label: "Active",       color: "text-green-400",  bg: "bg-green-900/30",  border: "border-green-800/50" },
    past_due:   { label: "Past Due",     color: "text-red-400",    bg: "bg-red-900/20",    border: "border-red-800/40" },
    canceled:   { label: "Canceled",     color: "text-slate-400",  bg: "bg-slate-800",     border: "border-slate-700" },
    incomplete: { label: "Incomplete",   color: "text-yellow-400", bg: "bg-yellow-900/20", border: "border-yellow-800/40" },
  };
  const s = map[status] ?? map.incomplete;
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${s.color} ${s.bg} ${s.border}`}>
      {s.label}
    </span>
  );
}

export default async function AccountPage() {
  const supabase = (await getSupabaseServer()) as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const db = getSupabaseAdmin() as any;

  const [profileRes, companyRes] = await Promise.all([
    db.from("profiles").select("id, first_name, last_name, slug, verification_status").eq("user_id", user.id).single(),
    db.from("companies").select("id, name, slug").eq("user_id", user.id).single(),
  ]);

  const profile = profileRes.data;
  const company = companyRes.data;

  // GC subscription
  const { data: sub } = company
    ? await db.from("gc_subscriptions").select("*").eq("company_id", company.id).order("created_at", { ascending: false }).limit(1).single()
    : { data: null };

  // Verification payment
  const { data: verif } = profile
    ? await db.from("verification_payments").select("status, amount_paid, amount_refunded, created_at").eq("profile_id", profile.id).order("created_at", { ascending: false }).limit(1).single()
    : { data: null };

  const gcSub = sub as GCSubRow | null;
  const verification = verif as VerificationRow | null;

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-16">

        <h1 className="text-2xl font-black text-white mb-8">My Account</h1>

        {/* Trade Card status */}
        {profile && (
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Trade Card</h2>
              <StatusBadge status={profile.verification_status ?? "pending"} />
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-600/20 border border-orange-600/40 rounded-xl flex items-center justify-center font-black text-orange-400 text-lg">
                {profile.first_name?.[0]}{profile.last_name?.[0]}
              </div>
              <div>
                <p className="font-bold text-white">{profile.first_name} {profile.last_name}</p>
                <Link href={`/pro/${profile.slug}`} className="text-xs text-orange-400 hover:underline flex items-center gap-1">
                  tradepronexus.com/pro/{profile.slug} <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>

            {profile.verification_status === "pending" && !verification && (
              <div className="mt-4 pt-4 border-t border-slate-700/50">
                <p className="text-sm text-slate-400 mb-3">
                  Get the Verified Pro badge — appear in GC searches and prove your credentials.
                </p>
                <Link href="/verify" className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white text-sm font-bold rounded-xl transition-colors">
                  <ShieldCheck className="w-4 h-4" /> Start Verification — $99
                </Link>
              </div>
            )}

            {verification && (
              <div className="mt-4 pt-4 border-t border-slate-700/50 text-sm">
                <p className="text-slate-500 text-xs uppercase tracking-widest font-semibold mb-2">Verification Payment</p>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">
                    ${(verification.amount_paid / 100).toFixed(2)} paid · {formatDate(verification.created_at)}
                  </span>
                  {verification.amount_refunded > 0 && (
                    <span className="text-green-400 text-xs">${(verification.amount_refunded / 100).toFixed(2)} refunded</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* GC Subscription */}
        {company && (
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">GC Subscription</h2>
              {gcSub ? <StatusBadge status={gcSub.status} /> : <span className="text-xs text-slate-500">No active plan</span>}
            </div>

            {gcSub ? (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="font-bold text-white">
                      {GC_TIERS[gcSub.tier]?.label} Plan
                      {gcSub.is_founder && (
                        <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold text-orange-400 bg-orange-900/30 border border-orange-800/40 px-1.5 py-0.5 rounded-full">
                          <Star className="w-3 h-3" /> FOUNDER
                        </span>
                      )}
                    </p>
                    <p className="text-slate-400 text-sm">${GC_TIERS[gcSub.tier]?.price}/month</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-slate-900/60 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs text-slate-400 uppercase tracking-wide font-semibold">Seats</span>
                    </div>
                    <p className="font-bold text-white">
                      {gcSub.seats_used} / {gcSub.seat_limit === null ? "∞" : gcSub.seat_limit}
                    </p>
                    <p className="text-xs text-slate-500">{GC_TIERS[gcSub.tier]?.description}</p>
                  </div>
                  <div className="bg-slate-900/60 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs text-slate-400 uppercase tracking-wide font-semibold">
                        {gcSub.status === "trialing" ? "Trial Ends" : "Renews"}
                      </span>
                    </div>
                    <p className="font-bold text-white text-sm">
                      {gcSub.status === "trialing"
                        ? formatDate(gcSub.trial_ends_at)
                        : formatDate(gcSub.current_period_end)}
                    </p>
                  </div>
                </div>

                {gcSub.status === "trialing" && (
                  <div className="bg-blue-950/30 border border-blue-800/40 rounded-xl p-3 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-blue-300">
                      Your free trial ends on {formatDate(gcSub.trial_ends_at)}.
                      Add a payment method before then to keep access. No charge today.
                    </p>
                  </div>
                )}

                {gcSub.status === "past_due" && (
                  <div className="bg-red-950/30 border border-red-800/40 rounded-xl p-3 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-red-300">
                      Payment failed. Update your payment method to restore access.
                    </p>
                  </div>
                )}

                {gcSub.is_founder && (
                  <div className="mt-3 bg-orange-950/30 border border-orange-800/40 rounded-xl p-3 flex items-center gap-2">
                    <Star className="w-4 h-4 text-orange-400 flex-shrink-0" />
                    <p className="text-xs text-orange-300">
                      Founder rate locked. Your ${GC_TIERS[gcSub.tier]?.price}/month rate is guaranteed forever.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div>
                <p className="text-slate-400 text-sm mb-4">
                  Upgrade to access verified crew search — bonding, payroll, and foreman details.
                </p>
                <Link href="/pricing" className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-700 hover:bg-blue-600 text-white text-sm font-bold rounded-xl transition-colors">
                  <Building2 className="w-4 h-4" /> View GC Plans
                </Link>
              </div>
            )}
          </div>
        )}

        {/* No profile at all */}
        {!profile && !company && (
          <div className="text-center py-12 bg-slate-800/40 border border-slate-700/50 rounded-2xl">
            <p className="text-slate-400 mb-4">No profile set up yet.</p>
            <Link href="/build" className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-sm transition-colors">
              Build My Trade Card
            </Link>
          </div>
        )}

        {/* Quick links */}
        <div className="mt-6 flex flex-wrap gap-3 text-xs text-slate-500">
          {profile && <Link href={`/pro/${profile.slug}`} className="hover:text-orange-400 transition-colors">View Trade Card →</Link>}
          {company && <Link href={`/company/${company.slug}`} className="hover:text-blue-400 transition-colors">View Company Page →</Link>}
          <Link href="/pricing" className="hover:text-slate-300 transition-colors">Plans & Pricing →</Link>
          <Link href="/verify" className="hover:text-green-400 transition-colors">Verification →</Link>
        </div>
      </div>
    </div>
  );
}
