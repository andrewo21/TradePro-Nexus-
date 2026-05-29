import { notFound } from "next/navigation";
import {
  ShieldCheck, MapPin, Building2, Users, Briefcase, Phone, Mail,
  CheckCircle, HardHat, Camera, Globe, ArrowRight
} from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { getSupabaseServer } from "@/lib/supabaseServer";
import type { Company, Profile } from "@/types/database";
import FollowButton from "@/components/FollowButton";

function formatCurrency(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(0)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

export default async function CompanyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = (await getSupabaseServer()) as any;

  const { data: company } = (await db
    .from("companies")
    .select("*")
    .eq("slug", slug)
    .single()) as { data: Company | null; error: unknown };

  if (!company) notFound();

  type ForemanRow = Pick<Profile, "first_name" | "last_name" | "slug" | "trade" | "years_experience" | "verification_status">;
  const { data: foremen } = (await db
    .from("profiles")
    .select("first_name, last_name, slug, trade, years_experience, verification_status")
    .eq("company_id", company.id)
    .eq("is_lead_foreman", true)) as { data: ForemanRow[] | null; error: unknown };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 pt-24 pb-16">

        {/* Hero */}
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/60 rounded-2xl p-6 mb-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-blue-600/20 border-2 border-blue-600/40 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Building2 className="w-8 h-8 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between flex-wrap gap-2">
                <div>
                  <h1 className="text-xl font-black text-white">{company.name}</h1>
                  {company.trade_specialties?.[0] && (
                    <p className="text-blue-400 font-semibold text-sm">{company.trade_specialties[0]}</p>
                  )}
                </div>
                {company.verification_status === "verified" && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-400 bg-green-900/30 border border-green-800/40 px-2 py-0.5 rounded-full">
                    <ShieldCheck className="w-3 h-3" /> VERIFIED
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-400">
                {(company.location_city || company.location_state) && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {[company.location_city, company.location_state].filter(Boolean).join(", ")}
                  </span>
                )}
                {company.years_in_business && (
                  <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{company.years_in_business} yrs in business</span>
                )}
                {company.crew_capacity && (
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" />{company.crew_capacity} workers</span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-700/50">
            <FollowButton followingId={company.id} followingType="company" label={`Follow ${company.name}`} />
          </div>

          {company.description && (
            <p className="text-slate-300 text-sm mt-4 leading-relaxed border-t border-slate-700/50 pt-4">
              {company.description}
            </p>
          )}
        </div>

        {/* Capacity at a glance */}
        {(company.bonding_capacity || company.crew_capacity || company.direct_payroll_percentage || company.geographic_radius_miles) && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {company.bonding_capacity && (
              <div className="bg-green-950/30 border border-green-800/40 rounded-xl p-3 text-center">
                <p className="text-lg font-black text-green-400">{formatCurrency(company.bonding_capacity)}</p>
                <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wide">Bonding Capacity</p>
              </div>
            )}
            {company.crew_capacity && (
              <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3 text-center">
                <p className="text-lg font-black text-white">{company.crew_capacity}</p>
                <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wide">Crew Capacity</p>
              </div>
            )}
            {company.direct_payroll_percentage != null && (
              <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3 text-center">
                <p className="text-lg font-black text-white">{company.direct_payroll_percentage}%</p>
                <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wide">Direct Payroll</p>
              </div>
            )}
            {company.geographic_radius_miles && (
              <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3 text-center">
                <p className="text-lg font-black text-white">{company.geographic_radius_miles}mi</p>
                <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wide">Geo Radius</p>
              </div>
            )}
          </div>
        )}

        {/* Sector Experience */}
        {(company.sector_experience?.length ?? 0) > 0 && (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 mb-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
              <Briefcase className="w-4 h-4 text-orange-400" /> Sector Experience
            </h2>
            <div className="flex flex-wrap gap-2">
              {(company.sector_experience ?? []).map((s: string) => (
                <span key={s} className="px-3 py-1.5 bg-blue-950/50 border border-blue-800/40 text-blue-300 text-xs font-semibold rounded-full">
                  {s}
                </span>
              ))}
            </div>
            {(company.min_project_value || company.max_project_value) && (
              <p className="text-xs text-slate-500 mt-2">
                Typical project range:{" "}
                {company.min_project_value ? formatCurrency(company.min_project_value) : "—"}
                {" – "}
                {company.max_project_value ? formatCurrency(company.max_project_value) : "—"}
              </p>
            )}
          </div>
        )}

        {/* Lead Foremen */}
        {(foremen?.length ?? 0) > 0 && (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 mb-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
              <HardHat className="w-4 h-4 text-orange-400" /> Meet the Lead Foremen
            </h2>
            <p className="text-xs text-slate-500 mb-3">
              See the actual talent you're hiring — not just the company name.
            </p>
            <div className="space-y-2">
              {(foremen ?? []).map((f) => (
                <Link
                  key={f.slug}
                  href={`/pro/${f.slug}`}
                  className="flex items-center justify-between bg-slate-900/60 border border-slate-700/50 hover:border-orange-700/50 rounded-xl p-3 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-orange-600/20 border border-orange-600/40 rounded-lg flex items-center justify-center font-black text-orange-400 text-sm">
                      {f.first_name[0]}{f.last_name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white group-hover:text-orange-300 transition-colors">
                        {f.first_name} {f.last_name}
                      </p>
                      <p className="text-xs text-slate-400">{f.trade} · {f.years_experience} yrs exp</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {f.verification_status === "verified" && (
                      <span className="text-[10px] text-green-400 bg-green-900/30 border border-green-800/50 px-2 py-0.5 rounded-full font-bold">VERIFIED</span>
                    )}
                    <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-orange-400 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Gallery */}
        {(company.gallery_urls?.length ?? 0) > 0 && (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 mb-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-orange-400" /> Work Gallery
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {((company.gallery_urls as string[]) ?? []).map((url: string, i: number) => (
                <div key={i} className="aspect-square rounded-lg overflow-hidden bg-slate-900/60 border border-slate-700/50">
                  <img src={url} alt="Work photo" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="bg-gradient-to-br from-blue-950/40 to-slate-900 border border-blue-800/40 rounded-2xl p-6">
          <h2 className="text-lg font-black text-white mb-1">Ready to Connect?</h2>
          <p className="text-sm text-slate-400 mb-4">
            {company.verification_status === "verified"
              ? "Verified contractor. Documents on file."
              : "Verification in progress."}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            {company.phone && (
              <a
                href={`tel:${company.phone}`}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-700 hover:bg-blue-600 text-white font-bold rounded-xl text-sm transition-colors"
              >
                <Phone className="w-4 h-4" /> {company.phone}
              </a>
            )}
            {company.email && (
              <a
                href={`mailto:${company.email}`}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white font-semibold rounded-xl text-sm transition-colors"
              >
                <Mail className="w-4 h-4" /> Send Bid Inquiry
              </a>
            )}
            {company.website && (
              <a
                href={`https://${company.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-3 border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white rounded-xl text-sm transition-colors"
              >
                <Globe className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-600 mt-8">
          <Link href="/" className="hover:text-slate-400 transition-colors">TradePro Nexus</Link>
          {" "}· A TradePro Enterprises product
        </p>
      </div>
    </div>
  );
}
