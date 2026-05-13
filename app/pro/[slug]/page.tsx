import { ShieldCheck, MapPin, Clock, Users, Briefcase, Phone, Mail, Camera, CheckCircle, Building2, HardHat } from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

// Static mock data for preview/demo — replaced with Supabase fetch in production
const MOCK_PROFILE = {
  firstName: "Marcus",
  lastName: "Thompson",
  slug: "marcus-thompson",
  trade: "Commercial Electrician",
  yearsExperience: 18,
  locationCity: "Chicago",
  locationState: "IL",
  phone: "(312) 555-0100",
  email: "marcus@email.com",
  bio: "18-year commercial electrician specializing in high-rise and healthcare. IBEW Local 134. Lead Foreman on 12 major projects over $5M. Known for clean roughins, on-time schedules, and zero punch-list electrical deficiencies.",
  oshaSelected: ["OSHA 30 — Construction", "Fall Protection", "First Aid / CPR"],
  otherCerts: "Journeyman Electrician License — IL, IBEW Local 134",
  payrollType: "direct" as const,
  availabilityStatus: "available" as const,
  crewSize: 14,
  isLeadForeman: true,
  verificationStatus: "verified" as const,
  company: "Midwest Electrical Solutions",
  companySlug: "midwest-electrical-solutions",
  projects: [
    { name: "Northwestern Hospital Tower Expansion", value: "$22M", role: "Lead Foreman", sector: "Healthcare" },
    { name: "39-Story Lakeshore Mixed-Use", value: "$8.4M scope", role: "Foreman", sector: "Multifamily" },
    { name: "Federal Courthouse Renovation", value: "$14M", role: "Lead Electrician", sector: "Federal / Gov't" },
  ],
};

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

export default function TradeCardPage({ params }: { params: { slug: string } }) {
  const profile = MOCK_PROFILE;

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-16">

        {/* Hero Card */}
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/60 rounded-2xl p-6 mb-4">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 bg-orange-600/20 border-2 border-orange-600/40 rounded-2xl flex items-center justify-center font-black text-orange-400 text-2xl flex-shrink-0">
              {profile.firstName[0]}{profile.lastName[0]}
            </div>

            {/* Identity */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between flex-wrap gap-2">
                <div>
                  <h1 className="text-xl font-black text-white">
                    {profile.firstName} {profile.lastName}
                  </h1>
                  <p className="text-orange-400 font-semibold">{profile.trade}</p>
                </div>
                <VerificationBadge status={profile.verificationStatus} />
              </div>

              <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-400">
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{profile.locationCity}, {profile.locationState}</span>
                <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{profile.yearsExperience} yrs exp</span>
                {profile.crewSize && <span className="flex items-center gap-1"><Users className="w-3 h-3" />Crew of {profile.crewSize}</span>}
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2 mt-3">
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${
                  profile.availabilityStatus === "available"
                    ? "text-green-400 bg-green-900/30 border-green-800/50"
                    : "text-yellow-400 bg-yellow-900/30 border-yellow-800/50"
                }`}>
                  {profile.availabilityStatus === "available" ? "Available Now" : "Available Soon"}
                </span>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${
                  profile.payrollType === "direct"
                    ? "text-green-400 bg-green-900/30 border-green-800/50"
                    : "text-yellow-400 bg-yellow-900/30 border-yellow-800/50"
                }`}>
                  {profile.payrollType === "direct" ? "Direct Payroll" : profile.payrollType === "mixed" ? "Mixed Payroll" : "1099"}
                </span>
                {profile.isLeadForeman && (
                  <span className="text-[10px] font-bold text-orange-400 bg-orange-900/30 border border-orange-800/50 px-2 py-1 rounded-full">
                    Lead Foreman
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="text-slate-300 text-sm mt-4 leading-relaxed border-t border-slate-700/50 pt-4">
              {profile.bio}
            </p>
          )}
        </div>

        {/* Company Link */}
        {profile.company && (
          <Link href={`/company/${profile.companySlug}`} className="block bg-slate-800/50 border border-slate-700/50 hover:border-blue-700/60 rounded-xl p-4 mb-4 transition-colors group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Company</p>
                  <p className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors">{profile.company}</p>
                </div>
              </div>
              <span className="text-xs text-blue-400 font-semibold group-hover:underline">View Profile →</span>
            </div>
          </Link>
        )}

        {/* Certifications */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 mb-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-orange-400" /> Certifications &amp; Credentials
          </h2>
          <div className="space-y-2">
            {profile.oshaSelected.map((cert) => (
              <div key={cert} className="flex items-center gap-2 text-sm text-slate-300">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" /> {cert}
              </div>
            ))}
            {profile.otherCerts && (
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" /> {profile.otherCerts}
              </div>
            )}
          </div>
        </div>

        {/* Project Experience */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 mb-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
            <HardHat className="w-4 h-4 text-orange-400" /> Project Experience
          </h2>
          <div className="space-y-3">
            {profile.projects.map((proj) => (
              <div key={proj.name} className="bg-slate-900/60 rounded-lg p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-white">{proj.name}</p>
                  <span className="text-xs bg-blue-950/60 text-blue-400 border border-blue-800/40 px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">{proj.sector}</span>
                </div>
                <div className="flex gap-3 mt-1 text-xs text-slate-400">
                  <span className="text-orange-400 font-semibold">{proj.value}</span>
                  <span>· {proj.role}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Work Gallery Placeholder */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 mb-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
            <Camera className="w-4 h-4 text-orange-400" /> Work Notoriety Gallery
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="aspect-square bg-slate-900/60 border border-slate-700/50 rounded-lg flex items-center justify-center">
                <Camera className="w-6 h-6 text-slate-600" />
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-600 mt-2 text-center">Jobsite photos coming soon</p>
        </div>

        {/* Contact */}
        <div className="bg-gradient-to-br from-orange-950/30 to-slate-900 border border-orange-900/40 rounded-xl p-5">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Contact This Pro</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href={`tel:${profile.phone}`}
              className="flex items-center justify-center gap-2 flex-1 px-4 py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-sm transition-colors"
            >
              <Phone className="w-4 h-4" /> {profile.phone}
            </a>
            <a
              href={`mailto:${profile.email}`}
              className="flex items-center justify-center gap-2 flex-1 px-4 py-3 border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white font-semibold rounded-xl text-sm transition-colors"
            >
              <Mail className="w-4 h-4" /> Email
            </a>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-600 mt-8">
          <Link href="/" className="hover:text-slate-400 transition-colors">TradePro Nexus</Link>
          {" "}· A TradePro Enterprises product ·{" "}
          <Link href="/build" className="hover:text-slate-400 transition-colors">Build Your Trade Card</Link>
        </p>
      </div>
    </div>
  );
}
