import {
  ShieldCheck, MapPin, Building2, Users, Briefcase, Phone, Mail,
  CheckCircle, HardHat, Camera, Globe, Star, ArrowRight
} from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

const MOCK_COMPANY = {
  name: "Midwest Electrical Solutions",
  slug: "midwest-electrical-solutions",
  tradeSpecialties: ["Commercial Electrical", "Healthcare Systems", "High-Rise MEP"],
  description:
    "25-year Chicago-based electrical contractor with deep expertise in healthcare, high-rise, and federal work. IBEW signatory shop. Full direct payroll workforce. Licensed and bonded in IL, IN, WI, and MN.",
  website: "midwestelectrical.com",
  phone: "(312) 555-0200",
  email: "bids@midwestelectrical.com",
  locationCity: "Chicago",
  locationState: "IL",
  bondingCapacity: 35_000_000,
  bondingCompany: "Travelers Surety",
  payrollType: "direct" as const,
  crewCapacity: 85,
  minProjectValue: 500_000,
  maxProjectValue: 40_000_000,
  geographicRadius: 300,
  sectorExperience: ["Healthcare", "Federal / Gov't", "Multifamily", "K-12 Education", "Mixed-Use"],
  yearsInBusiness: 25,
  directPayrollPercentage: 100,
  availabilityStatus: "available" as const,
  verificationStatus: "verified" as const,
  matchTier: "green" as const,
  foremen: [
    { name: "Marcus Thompson", trade: "Commercial Electrician", slug: "marcus-thompson", yrs: 18 },
    { name: "Diana Cruz", trade: "Electrical Foreman", slug: "diana-cruz", yrs: 12 },
  ],
  projects: [
    { name: "Northwestern Hospital Tower", value: "$22M", sector: "Healthcare", year: "2023" },
    { name: "39-Story Lakeshore Tower", value: "$8.4M scope", sector: "Multifamily", year: "2022" },
    { name: "Cook County Courthouse", value: "$14M", sector: "Federal", year: "2021" },
    { name: "Lincoln Park Academy", value: "$3.2M", sector: "K-12 Education", year: "2020" },
  ],
};

function formatCurrency(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(0)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

function TierBadge({ tier }: { tier: "green" | "yellow" | "blue" }) {
  const map = {
    green:  { label: "Prime", color: "text-green-400 bg-green-900/30 border-green-800/50", dot: "bg-green-400" },
    yellow: { label: "Potential", color: "text-yellow-400 bg-yellow-900/30 border-yellow-800/50", dot: "bg-yellow-400" },
    blue:   { label: "Local Force", color: "text-blue-400 bg-blue-900/30 border-blue-800/50", dot: "bg-blue-400" },
  };
  const t = map[tier];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${t.color}`}>
      <span className={`w-2 h-2 rounded-full ${t.dot}`} /> {t.label} Match
    </span>
  );
}

export default function CompanyPage({ params }: { params: { slug: string } }) {
  const company = MOCK_COMPANY;

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
                  <p className="text-blue-400 font-semibold text-sm">{company.tradeSpecialties[0]}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {company.verificationStatus === "verified" && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-400 bg-green-900/30 border border-green-800/40 px-2 py-0.5 rounded-full">
                      <ShieldCheck className="w-3 h-3" /> VERIFIED
                    </span>
                  )}
                  <TierBadge tier={company.matchTier} />
                </div>
              </div>

              <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-400">
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{company.locationCity}, {company.locationState}</span>
                <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{company.yearsInBusiness} yrs in business</span>
                <span className="flex items-center gap-1"><Users className="w-3 h-3" />{company.crewCapacity} workers</span>
              </div>
            </div>
          </div>

          <p className="text-slate-300 text-sm mt-4 leading-relaxed border-t border-slate-700/50 pt-4">
            {company.description}
          </p>
        </div>

        {/* Capacity at a glance */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="bg-green-950/30 border border-green-800/40 rounded-xl p-3 text-center">
            <p className="text-lg font-black text-green-400">{formatCurrency(company.bondingCapacity)}</p>
            <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wide">Bonding Capacity</p>
          </div>
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3 text-center">
            <p className="text-lg font-black text-white">{company.crewCapacity}</p>
            <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wide">Crew Capacity</p>
          </div>
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3 text-center">
            <p className="text-lg font-black text-white">{company.directPayrollPercentage}%</p>
            <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wide">Direct Payroll</p>
          </div>
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3 text-center">
            <p className="text-lg font-black text-white">{company.geographicRadius}mi</p>
            <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wide">Geo Radius</p>
          </div>
        </div>

        {/* Verified Documents */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 mb-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-orange-400" /> Verified Documents
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { label: "Bonding Certificate", sub: `${company.bondingCompany} · ${formatCurrency(company.bondingCapacity)}`, ok: true },
              { label: "Certificate of Insurance", sub: "Current · Exp tracked", ok: true },
              { label: "W9 on File", sub: "Tax compliance verified", ok: true },
            ].map((doc) => (
              <div key={doc.label} className="flex items-start gap-2 bg-green-950/20 border border-green-800/30 rounded-lg p-3">
                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-white">{doc.label}</p>
                  <p className="text-[11px] text-slate-400">{doc.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sector Experience */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 mb-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
            <Star className="w-4 h-4 text-orange-400" /> Sector Experience
          </h2>
          <div className="flex flex-wrap gap-2">
            {company.sectorExperience.map((s) => (
              <span key={s} className="px-3 py-1.5 bg-blue-950/50 border border-blue-800/40 text-blue-300 text-xs font-semibold rounded-full">
                {s}
              </span>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Project range: {formatCurrency(company.minProjectValue)} – {formatCurrency(company.maxProjectValue)}
          </p>
        </div>

        {/* Lead Foremen — the key differentiator */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 mb-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
            <HardHat className="w-4 h-4 text-orange-400" /> Meet the Lead Foremen
          </h2>
          <p className="text-xs text-slate-500 mb-3">
            See the actual talent you're hiring — not just the company name.
          </p>
          <div className="space-y-2">
            {company.foremen.map((f) => (
              <Link key={f.slug} href={`/pro/${f.slug}`} className="flex items-center justify-between bg-slate-900/60 border border-slate-700/50 hover:border-orange-700/50 rounded-xl p-3 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-orange-600/20 border border-orange-600/40 rounded-lg flex items-center justify-center font-black text-orange-400 text-sm">
                    {f.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white group-hover:text-orange-300 transition-colors">{f.name}</p>
                    <p className="text-xs text-slate-400">{f.trade} · {f.yrs} yrs exp</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-green-400 bg-green-900/30 border border-green-800/50 px-2 py-0.5 rounded-full font-bold">VERIFIED</span>
                  <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-orange-400 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Project History */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 mb-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
            <Briefcase className="w-4 h-4 text-orange-400" /> Notable Projects
          </h2>
          <div className="space-y-2">
            {company.projects.map((proj) => (
              <div key={proj.name} className="flex items-center justify-between bg-slate-900/50 rounded-lg p-3">
                <div>
                  <p className="text-sm font-semibold text-white">{proj.name}</p>
                  <p className="text-xs text-slate-400">{proj.sector} · {proj.year}</p>
                </div>
                <span className="text-orange-400 font-bold text-sm">{proj.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Work Gallery */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 mb-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
            <Camera className="w-4 h-4 text-orange-400" /> Work Gallery
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-square bg-slate-900/60 border border-slate-700/50 rounded-lg flex items-center justify-center">
                <Camera className="w-6 h-6 text-slate-600" />
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-br from-blue-950/40 to-slate-900 border border-blue-800/40 rounded-2xl p-6">
          <h2 className="text-lg font-black text-white mb-1">Ready to Connect?</h2>
          <p className="text-sm text-slate-400 mb-4">All documents verified. Direct payroll workforce. Available now.</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href={`tel:${company.phone}`}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-700 hover:bg-blue-600 text-white font-bold rounded-xl text-sm transition-colors"
            >
              <Phone className="w-4 h-4" /> {company.phone}
            </a>
            <a
              href={`mailto:${company.email}`}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white font-semibold rounded-xl text-sm transition-colors"
            >
              <Mail className="w-4 h-4" /> Send Bid Inquiry
            </a>
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
