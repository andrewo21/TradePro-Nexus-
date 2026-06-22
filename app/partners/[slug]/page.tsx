import { notFound } from "next/navigation";
import { CheckCircle, Shield, Briefcase, FileText, Users } from "lucide-react";
import Navbar from "@/components/Navbar";
import EmailCapture from "@/components/EmailCapture";
import Link from "next/link";
import { getPartnerConfig, getPromoCode } from "@/lib/partners";
import { getSupabaseAdmin } from "@/lib/supabaseServer";

const VALUE_PROPS = [
  {
    icon: CheckCircle,
    title: "Free Trade Card",
    body: "Build your Digital Trading Card — no cost, ever, for trade pros.",
  },
  {
    icon: Shield,
    title: "Union Badge",
    body: "Show GCs you're a union member with a distinct Union Member badge on your profile.",
  },
  {
    icon: Briefcase,
    title: "Union Job Opportunities",
    body: "Get matched to union and prevailing-wage jobs in your trade and market.",
  },
  {
    icon: FileText,
    title: "Resume Builder Discount",
    body: "10% off TradePro Tech's resume builder with your union discount code.",
  },
];

export default async function PartnerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const config = getPartnerConfig(slug);
  if (!config) notFound();

  const promoCode = getPromoCode(config);
  const promoLink = `https://www.tradeprotech.ai/?promo=${promoCode}&ref=${config.slug}`;
  const pageUrl = `https://tradepronexus.com/partners/${config.slug}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&bgcolor=0f172a&color=f1f5f9&data=${encodeURIComponent(pageUrl)}`;

  // Live member count — query profiles where union_name matches this partner
  const db = getSupabaseAdmin() as any;
  const { count: memberCount } = await db
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("union_member", true)
    .ilike("union_name", `%${config.name}%`)
    .or("is_internal.is.null,is_internal.eq.false");

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <Navbar />

      {/* Co-branded header — union color left, TradePro navy right, orange center */}
      <div
        className="pt-16"
        style={{
          background: `linear-gradient(to right, ${config.color} 0%, ${config.color} 42%, #f97316 50%, #0f172a 58%, #0f172a 100%)`,
        }}
      >
        <div className="max-w-2xl mx-auto px-4 py-6 flex items-center justify-center gap-3 flex-wrap text-center">
          <span className="text-white font-black text-lg">{config.name}</span>
          <span className="text-white font-black text-xl">×</span>
          <span className="text-white font-black text-lg">
            TradePro <span className="text-orange-200">Nexus</span>
          </span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-3xl md:text-4xl font-black text-white mb-3 leading-tight text-center">
          {config.name} Members — Build Your Trade Card Free
        </h1>
        <p className="text-slate-300 text-lg text-center mb-10">
          Get discovered by GCs searching for union crews in your market.
        </p>

        {/* Value props */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          {VALUE_PROPS.map(vp => {
            const Icon = vp.icon;
            return (
              <div key={vp.title} className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
                <Icon className="w-6 h-6 text-orange-400 mb-2" />
                <p className="font-bold text-white mb-1">{vp.title}</p>
                <p className="text-slate-400 text-sm">{vp.body}</p>
              </div>
            );
          })}
        </div>

        {/* Signup form */}
        <div className="bg-gradient-to-br from-orange-950/30 to-slate-900 border border-orange-800/40 rounded-2xl p-6 mb-8">
          <EmailCapture
            source={`${config.slug}_partner`}
            fixedUserType="pro"
            title={`Join as a ${config.name} member`}
            subtitle={`Free Trade Card + Union Badge for ${config.fullName} members.`}
            buttonLabel="Build My Trade Card — Free"
            successTitle="You're in."
            successBody="We'll email you to get your Trade Card set up — including your Union Badge."
          />
        </div>

        {/* Live member count */}
        <div className="bg-blue-950/30 border border-blue-800/50 rounded-2xl p-5 text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Users className="w-5 h-5 text-blue-400" />
            <span className="text-3xl font-black text-white">{(memberCount ?? 0).toLocaleString()}</span>
          </div>
          <p className="text-blue-200 text-sm font-semibold mb-3">
            {config.name} members already on TradePro Nexus
          </p>
          <Link
            href="/search?tab=union"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:text-blue-200 transition-colors underline underline-offset-2"
          >
            View {config.name} members in the Union Directory →
          </Link>
        </div>

        {/* Promo code */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 text-center mb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Resume Builder Discount</p>
          <p className="text-slate-300 text-sm mb-3">
            Use code{" "}
            <code className="text-orange-400 font-mono font-bold bg-slate-900 px-2 py-1 rounded-lg border border-slate-700">
              {promoCode}
            </code>{" "}
            for 10% off TradePro Tech
          </p>
          <a
            href={promoLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-700 hover:bg-blue-600 text-white font-bold rounded-xl text-sm transition-colors"
          >
            Apply Discount on TradePro Tech →
          </a>
        </div>

        {/* QR code for union halls */}
        <div className="text-center text-slate-500 text-xs">
          <p className="mb-2">Print this page or scan at your union hall:</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrUrl}
            alt={`QR code linking to ${pageUrl}`}
            width={120}
            height={120}
            className="mx-auto rounded-lg border border-slate-700"
          />
        </div>
      </div>
    </div>
  );
}
