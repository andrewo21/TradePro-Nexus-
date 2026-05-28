import { notFound } from "next/navigation";
import { ShieldCheck, MapPin, Users, Briefcase, Phone, Mail, Camera, CheckCircle, Building2, HardHat } from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { getSupabaseServer } from "@/lib/supabaseServer";
import type { Profile, Company } from "@/types/database";

function VerificationBadge({ status }: { status: string }) {
  if (status !== "verified") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-full">
        PENDING VERIFICATION
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-400 bg-green-900/30 border border-green-800/40 px-2 py-0.5 rounded-full">
      <ShieldCheck className="w-3 h-3" /> VERIFIED PRO
    </span>
  );
}

export default async function TradeCardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = (await getSupabaseServer()) as any;

  const { data: profile } = (await db
    .from("profiles")
    .select("*")
    .eq("slug", slug)
    .single()) as { data: Profile | null; error: unknown };

  if (!profile) notFound();

  const { data: company } = profile.company_id
    ? ((await db
        .from("companies")
        .select("name, slug")
        .eq("id", profile.company_id)
        .single()) as { data: Pick<Company, "name" | "slug"> | null; error: unknown })
    : { data: null };

  const otherCerts = (profile.other_certifications ?? []).join(", ");

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-16">

        {/* Hero Card */}
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/60 rounded-2xl p-6 mb-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-orange-600/20 border-2 border-orange-600/40 rounded-2xl flex items-center justify-center font-black text-orange-400 text-2xl flex-shrink-0">
              {profile.first_name[0]}{profile.last_name[0]}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between flex-wrap gap-2">
                <div>
                  <h1 className="text-xl font-black text-white">
                    {profile.first_name} {profile.last_name}
                  </h1>
                  <p className="text-orange-400 font-semibold">{profile.trade}</p>
                </div>
                <VerificationBadge status={profile.verification_status ?? "pending"} />
              </div>

              <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-400">
                {(profile.location_city || profile.location_state) && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {[profile.location_city, profile.location_state].filter(Boolean).join(", ")}
                  </span>
                )}
                <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{profile.years_experience} yrs exp</span>
                {profile.crew_size && <span className="flex items-center gap-1"><Users className="w-3 h-3" />Crew of {profile.crew_size}</span>}
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${
                  profile.availability_status === "available"
                    ? "text-green-400 bg-green-900/30 border-green-800/50"
                    : profile.availability_status === "available_soon"
                    ? "text-yellow-400 bg-yellow-900/30 border-yellow-800/50"
                    : "text-red-400 bg-red-900/30 border-red-800/50"
                }`}>
                  {profile.availability_status === "available"
                    ? "Available Now"
                    : profile.availability_status === "available_soon"
                    ? profile.available_in_weeks ? `Available in ${profile.available_in_weeks} wks` : "Available Soon"
                    : "Booked"}
                </span>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${
                  profile.payroll_type === "direct"
                    ? "text-green-400 bg-green-900/30 border-green-800/50"
                    : profile.payroll_type === "mixed"
                    ? "text-yellow-400 bg-yellow-900/30 border-yellow-800/50"
                    : "text-slate-400 bg-slate-800 border-slate-700"
                }`}>
                  {profile.payroll_type === "direct" ? "Direct Payroll" : profile.payroll_type === "mixed" ? "Mixed Payroll" : "1099"}
                </span>
                {profile.is_lead_foreman && (
                  <span className="text-[10px] font-bold text-orange-400 bg-orange-900/30 border border-orange-800/50 px-2 py-1 rounded-full">
                    Lead Foreman
                  </span>
                )}
              </div>
            </div>
          </div>

          {profile.bio && (
            <p className="text-slate-300 text-sm mt-4 leading-relaxed border-t border-slate-700/50 pt-4">
              {profile.bio}
            </p>
          )}
        </div>

        {/* Company Link */}
        {company && (
          <Link href={`/company/${company.slug}`} className="block bg-slate-800/50 border border-slate-700/50 hover:border-blue-700/60 rounded-xl p-4 mb-4 transition-colors group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Company</p>
                  <p className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors">{company.name}</p>
                </div>
              </div>
              <span className="text-xs text-blue-400 font-semibold group-hover:underline">View Profile →</span>
            </div>
          </Link>
        )}

        {/* Certifications */}
        {((profile.osha_certifications?.length ?? 0) > 0 || otherCerts) && (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 mb-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-orange-400" /> Certifications &amp; Credentials
            </h2>
            <div className="space-y-2">
              {(profile.osha_certifications ?? []).map((cert) => (
                <div key={cert} className="flex items-center gap-2 text-sm text-slate-300">
                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" /> {cert}
                </div>
              ))}
              {otherCerts && (
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" /> {otherCerts}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Work Gallery */}
        {(profile.gallery_urls?.length ?? 0) > 0 && (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 mb-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-orange-400" /> Work Notoriety Gallery
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {(profile.gallery_urls ?? []).map((url, i) => (
                <div key={i} className="aspect-square rounded-lg overflow-hidden bg-slate-900/60 border border-slate-700/50">
                  <img src={url} alt="Work photo" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contact */}
        {(profile.phone || profile.email) && (
          <div className="bg-gradient-to-br from-orange-950/30 to-slate-900 border border-orange-900/40 rounded-xl p-5">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Contact This Pro</h2>
            <div className="flex flex-col sm:flex-row gap-3">
              {profile.phone && (
                <a
                  href={`tel:${profile.phone}`}
                  className="flex items-center justify-center gap-2 flex-1 px-4 py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-sm transition-colors"
                >
                  <Phone className="w-4 h-4" /> {profile.phone}
                </a>
              )}
              {profile.email && (
                <a
                  href={`mailto:${profile.email}`}
                  className="flex items-center justify-center gap-2 flex-1 px-4 py-3 border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white font-semibold rounded-xl text-sm transition-colors"
                >
                  <Mail className="w-4 h-4" /> Email
                </a>
              )}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-slate-600 mt-8">
          <Link href="/" className="hover:text-slate-400 transition-colors">TradePro Nexus</Link>
          {" "}· A TradePro Enterprises product ·{" "}
          <Link href="/build" className="hover:text-slate-400 transition-colors">Build Your Trade Card</Link>
        </p>
      </div>
    </div>
  );
}
