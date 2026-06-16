"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  HardHat, ChevronRight, ChevronLeft, Upload, CheckCircle,
  User, Briefcase, ShieldCheck, ImageIcon, Calendar, ArrowRight,
  AlertCircle, X, Loader2, FileText, Ruler, Wrench, Shield
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import { SOCIAL_LINKS } from "@/lib/social";
import { LinkedinIcon, FacebookIcon, InstagramIcon } from "@/components/SocialIcons";
import {
  PROFILE_TYPES, type ProfileType,
  OSHA_CERTS, INSPECTOR_CERTS, ARCHITECT_CERTS, ARCHITECT_SOFTWARE,
  ENGINEER_DISCIPLINES, ENGINEER_SOFTWARE, TRADE_GROUPS,
  UNION_NAMES, UNION_MEMBER_STATUSES
} from "@/lib/constants";

// ── Constants ─────────────────────────────────────────────────────────────────

const ALL_TRADES = TRADE_GROUPS.filter(g =>
  ["Primary Trades", "Secondary Trades", "Specialty Trades", "Critical Support"].includes(g.label)
).flatMap(g => g.trades);

const SECTORS = [
  "Senior Living", "Healthcare", "Federal / Gov't", "Multifamily",
  "Industrial", "K-12 Education", "Mixed-Use", "Data Centers", "Hospitality",
];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

// ── Shared helpers ─────────────────────────────────────────────────────────────

function FileUploadZone({ label, hint, file, onChange, accept = ".pdf,.jpg,.jpeg,.png" }: {
  label: string; hint: string; file: File | null; onChange: (f: File | null) => void; accept?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-300 mb-1">{label}</label>
      <div
        className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${file ? "border-green-600 bg-green-950/20" : "border-slate-600 hover:border-orange-600 bg-slate-800/40"}`}
        onClick={() => document.getElementById(`file-${label.replace(/\s/g, "")}`)?.click()}
      >
        <input id={`file-${label.replace(/\s/g, "")}`} type="file" accept={accept} className="hidden" onChange={e => onChange(e.target.files?.[0] ?? null)} />
        {file ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-green-400"><CheckCircle className="w-5 h-5" /><span className="text-sm font-medium">{file.name}</span></div>
            <button onClick={e => { e.stopPropagation(); onChange(null); }} className="text-slate-400 hover:text-red-400"><X className="w-4 h-4" /></button>
          </div>
        ) : (
          <div><Upload className="w-6 h-6 text-slate-500 mx-auto mb-1" /><p className="text-xs text-slate-400">{hint}</p></div>
        )}
      </div>
    </div>
  );
}

function MultiSelect({ label, options, selected, onChange }: {
  label: string; options: readonly string[]; selected: string[]; onChange: (v: string[]) => void;
}) {
  function toggle(val: string) {
    onChange(selected.includes(val) ? selected.filter(x => x !== val) : [...selected, val]);
  }
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button key={opt} type="button" onClick={() => toggle(opt)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${selected.includes(opt) ? "bg-green-900/40 text-green-400 border border-green-700" : "bg-slate-900 text-slate-400 border border-slate-600 hover:border-slate-500"}`}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Form state ────────────────────────────────────────────────────────────────

interface FormData {
  profileType: ProfileType;
  firstName: string;
  lastName: string;
  firmName: string;
  email: string;
  phone: string;
  locationCity: string;
  locationState: string;
  locationZip: string;
  bio: string;
  // Trade Pro / Sub fields
  trade: string;
  yearsExperience: string;
  crewSize: string;
  isLeadForeman: boolean;
  payrollType: "direct" | "mixed" | "1099";
  oshaSelected: string[];
  otherCerts: string;
  // Inspector fields
  licenseNumber: string;
  licenseStates: string[];
  inspectorCerts: string[];
  inspectionTypes: string[];
  jurisdictions: string;
  // Architect fields
  aiaMember: boolean;
  architectSpecializations: string[];
  architectSoftware: string[];
  // Engineer fields
  engineerDiscipline: string;
  peLicenseNumber: string;
  engineerSoftware: string[];
  engineerCerts: string;
  // Union (Trade Pro / Sub)
  unionMember: boolean;
  unionName: string;
  unionLocalNumber: string;
  unionMemberStatus: string;
  prevailingWageCertified: boolean;
  davisBaconEligible: boolean;
  unionCardExpiration: string;
  // Shared
  availabilityStatus: "available" | "available_soon" | "booked";
  availableInWeeks: string;
  sectorExperience: string[];
  galleryFiles: File[];
  bondingFile: File | null;
  coiFile: File | null;
  w9File: File | null;
}

const defaultForm = (profileType: ProfileType = "tradepro"): FormData => ({
  profileType,
  firstName: "", lastName: "", firmName: "", email: "", phone: "",
  locationCity: "", locationState: "", locationZip: "", bio: "",
  trade: "", yearsExperience: "", crewSize: "", isLeadForeman: false,
  payrollType: "direct", oshaSelected: [], otherCerts: "",
  licenseNumber: "", licenseStates: [], inspectorCerts: [], inspectionTypes: [], jurisdictions: "",
  aiaMember: false, architectSpecializations: [], architectSoftware: [],
  engineerDiscipline: "", peLicenseNumber: "", engineerSoftware: [], engineerCerts: "",
  unionMember: false, unionName: "", unionLocalNumber: "", unionMemberStatus: "",
  prevailingWageCertified: false, davisBaconEligible: false, unionCardExpiration: "",
  availabilityStatus: "available", availableInWeeks: "", sectorExperience: [],
  galleryFiles: [], bondingFile: null, coiFile: null, w9File: null,
});

// Step definitions per profile type
function getSteps(profileType: ProfileType) {
  const base = [
    { id: 1, label: "Your Info", icon: User },
    { id: 2, label: "Credentials", icon: ShieldCheck },
    { id: 3, label: "Availability", icon: Calendar },
    { id: 4, label: "Photos", icon: ImageIcon },
  ];
  if (profileType === "tradepro" || profileType === "sub") {
    return [
      { id: 1, label: "Your Info", icon: User },
      { id: 2, label: "Trade & Skills", icon: Briefcase },
      { id: 3, label: "Certifications", icon: ShieldCheck },
      { id: 4, label: "Union", icon: Shield },
      { id: 5, label: "Availability", icon: Calendar },
      { id: 6, label: "Photos", icon: ImageIcon },
    ];
  }
  return base;
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function BuildPage() {
  const router = useRouter();
  const [profileType, setProfileType] = useState<ProfileType | null>(null);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(defaultForm());
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [finalSlug, setFinalSlug] = useState("");

  // If the user already has a profile, send them straight to their Trade Card
  useEffect(() => {
    getSupabase()?.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const pt = (user.user_metadata?.profile_type ?? user.user_metadata?.role ?? "tradepro") as ProfileType;
      const validTypes: ProfileType[] = ["tradepro", "sub", "inspector", "architect", "engineer"];
      const resolved = validTypes.includes(pt) ? pt : "tradepro";
      setProfileType(resolved);
      setForm(defaultForm(resolved));

      const db = getSupabase() as any;
      const { data: existing } = await db
        .from("profiles")
        .select("slug")
        .eq("user_id", user.id)
        .maybeSingle();
      if (existing?.slug) router.replace(`/pro/${existing.slug}`);
    });
  }, [router]);

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  const steps = getSteps(profileType ?? "tradepro");
  const totalSteps = steps.length;

  function canProceed(): boolean {
    if (step === 1) return !!(form.firstName && form.lastName && form.email && form.locationZip);
    if (profileType === "inspector" && step === 2) return !!(form.licenseNumber && form.licenseStates.length > 0);
    if (profileType === "architect" && step === 2) return !!(form.licenseNumber);
    if (profileType === "engineer" && step === 2) return !!(form.engineerDiscipline);
    if ((profileType === "tradepro" || profileType === "sub") && step === 2) return !!(form.trade && form.yearsExperience);
    return true;
  }

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const supabase = getSupabase();
      const { data: { user } } = await supabase!.auth.getUser();
      if (!user) { router.push("/signup"); return; }

      const db = supabase as any;
      const baseSlug = `${form.firstName.toLowerCase()}-${form.lastName.toLowerCase()}`.replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      let slug = baseSlug;
      const { data: existing } = await db.from("profiles").select("slug").eq("slug", baseSlug).maybeSingle();
      if (existing) slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;

      // Upload gallery images
      const galleryUrls: string[] = [];
      for (const file of form.galleryFiles) {
        const ext = file.name.split(".").pop();
        const path = `${user.id}/${slug}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
        const { error: upErr } = await db.storage.from("gallery").upload(path, file, { upsert: false });
        if (!upErr) {
          const { data: urlData } = db.storage.from("gallery").getPublicUrl(path);
          galleryUrls.push(urlData.publicUrl);
        }
      }

      // Build type_data JSONB based on profile type
      const typeData: Record<string, unknown> = {};
      if (profileType === "inspector") {
        typeData.inspector_certs = form.inspectorCerts;
        typeData.inspection_types = form.inspectionTypes;
        typeData.jurisdictions = form.jurisdictions;
      } else if (profileType === "architect") {
        typeData.aia_member = form.aiaMember;
        typeData.specializations = form.architectSpecializations;
        typeData.software = form.architectSoftware;
        typeData.certs = form.architectSoftware ?? []; // architect certs captured in specializations/software
      } else if (profileType === "engineer") {
        typeData.discipline = form.engineerDiscipline;
        typeData.pe_license_number = form.peLicenseNumber;
        typeData.software = form.engineerSoftware;
        typeData.certs = form.engineerCerts ? form.engineerCerts.split(",").map(s => s.trim()).filter(Boolean) : [];
      }

      const insertData = {
        user_id: user.id, slug,
        profile_type: profileType ?? "tradepro",
        first_name: form.firstName.trim(), last_name: form.lastName.trim(),
        firm_name: form.firmName.trim() || null,
        license_number: form.licenseNumber.trim() || null,
        license_states: form.licenseStates,
        type_data: typeData,
        trade: form.trade.trim() || (profileType === "inspector" ? "Special Inspector" : profileType === "architect" ? "Architect" : profileType === "engineer" ? `${form.engineerDiscipline} Engineer` : "Trade Pro"),
        years_experience: parseInt(form.yearsExperience) || 0,
        location_city: form.locationCity.trim(),
        location_state: form.locationState.trim().toUpperCase(),
        location_zip: form.locationZip.trim(),
        phone: form.phone.trim(), email: form.email.trim(), bio: form.bio.trim(),
        osha_certifications: form.oshaSelected,
        other_certifications: form.otherCerts ? form.otherCerts.split(",").map(s => s.trim()).filter(Boolean) : [],
        payroll_type: (profileType === "tradepro" || profileType === "sub") ? form.payrollType : "direct",
        is_lead_foreman: form.isLeadForeman,
        availability_status: form.availabilityStatus,
        available_in_weeks: form.availableInWeeks ? parseInt(form.availableInWeeks) : null,
        crew_size: form.crewSize ? parseInt(form.crewSize) : null,
        gallery_urls: galleryUrls,
        verification_status: "pending",
        union_member: form.unionMember,
        union_name: form.unionMember ? (form.unionName || null) : null,
        union_local_number: form.unionMember ? (form.unionLocalNumber.trim() || null) : null,
        union_member_status: form.unionMember ? (form.unionMemberStatus || null) : null,
        prevailing_wage_certified: form.prevailingWageCertified,
        davis_bacon_eligible: form.davisBaconEligible,
        union_card_expiration: form.unionCardExpiration || null,
      };

      const { data: profile, error: insertError } = await db.from("profiles").insert(insertData).select().single();
      if (insertError) throw insertError;

      // Upload verification docs
      const docUploads = [
        { type: "bonding", file: form.bondingFile },
        { type: "insurance_coi", file: form.coiFile },
        { type: "w9", file: form.w9File },
      ].filter(d => d.file);

      if (profile && docUploads.length) {
        const docRows = await Promise.all(docUploads.map(async doc => {
          const ext = doc.file!.name.split(".").pop();
          const path = `${user.id}/${slug}/${doc.type}.${ext}`;
          const { error: upErr } = await db.storage.from("documents").upload(path, doc.file!, { upsert: true });
          if (upErr) return null;
          const { data: urlData } = db.storage.from("documents").getPublicUrl(path);
          return { owner_id: profile.id, owner_type: "profile", document_type: doc.type, file_url: urlData.publicUrl, file_name: doc.file!.name };
        }));
        const valid = docRows.filter(Boolean);
        if (valid.length) await db.from("documents").insert(valid);
      }

      // Check for Profile Champion badge (fire-and-forget)
      fetch("/api/badges/check?trigger=profile", { method: "POST" }).catch(() => {});

      setFinalSlug(slug);
      setSubmitted(true);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  const slug = finalSlug || `${form.firstName.toLowerCase()}-${form.lastName.toLowerCase()}`.replace(/\s+/g, "-");
  const typeConfig = profileType ? PROFILE_TYPES[profileType] : PROFILE_TYPES.tradepro;

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-slate-100"><Navbar />
        <div className="flex items-center justify-center min-h-screen px-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-lg w-full text-center">
            <div className="w-16 h-16 bg-green-600/20 border border-green-600/40 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <h2 className="text-2xl font-black text-white mb-2">Your Trading Card is Live!</h2>
            <p className="text-slate-400 mb-6">
              {profileType === "inspector" || profileType === "architect" || profileType === "engineer"
                ? "Documents and license info are being processed. Your profile is visible and pending verification."
                : "Documents are being processed for AI verification. Your profile will appear in GC searches once verified."}
            </p>
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 mb-6 text-left">
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Your Public URL</p>
              <p className="text-orange-400 font-mono font-bold">tradepronexus.com/pro/{slug || "your-name"}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href={`/pro/${slug || "preview"}`} className="flex-1 px-5 py-3 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-xl text-sm transition-colors text-center">
                View My Trading Card
              </Link>
              <Link href="/" className="flex-1 px-5 py-3 border border-slate-600 text-slate-300 rounded-xl text-sm transition-colors text-center hover:border-slate-400">
                Back to Home
              </Link>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-800">
              <p className="text-sm text-slate-400 mb-3">Follow TradePro Nexus for updates and new features</p>
              <div className="flex items-center justify-center gap-3">
                <a href={SOCIAL_LINKS.linkedin} target="_blank" rel="noopener noreferrer" aria-label="Follow TradePro Nexus on LinkedIn"
                  className="w-10 h-10 flex items-center justify-center bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 hover:text-white transition-colors">
                  <LinkedinIcon className="w-4 h-4" />
                </a>
                <a href={SOCIAL_LINKS.facebook} target="_blank" rel="noopener noreferrer" aria-label="Follow TradePro Nexus on Facebook"
                  className="w-10 h-10 flex items-center justify-center bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 hover:text-white transition-colors">
                  <FacebookIcon className="w-4 h-4" />
                </a>
                <a href={SOCIAL_LINKS.instagram} target="_blank" rel="noopener noreferrer" aria-label="Follow TradePro Nexus on Instagram"
                  className="w-10 h-10 flex items-center justify-center bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 hover:text-white transition-colors">
                  <InstagramIcon className="w-4 h-4" />
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  if (!profileType) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-slate-100"><Navbar />
        <div className="flex items-center justify-center min-h-screen"><div className="text-slate-500">Loading your profile type…</div></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100"><Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-16">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-orange-600/20 border border-orange-600/40 rounded-xl flex items-center justify-center">
            <HardHat className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Build Your Digital Trading Card</h1>
            <p className="text-sm text-slate-400">{typeConfig.label} · Visible to GCs, owners, and the full construction network</p>
          </div>
        </div>

        {/* Step progress */}
        <div className="flex items-center gap-1 mb-8">
          {steps.map((s, i) => {
            const Icon = s.icon;
            const active = s.id === step, done = s.id < step;
            return (
              <div key={s.id} className="flex items-center gap-1 flex-1">
                <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors flex-1 ${active ? "bg-orange-600 text-white" : done ? "bg-green-700/30 text-green-400" : "bg-slate-800 text-slate-500"}`}>
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="hidden sm:block truncate">{s.label}</span>
                </div>
                {i < steps.length - 1 && <div className={`w-3 h-0.5 rounded-full flex-shrink-0 ${done ? "bg-green-600" : "bg-slate-700"}`} />}
              </div>
            );
          })}
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}
            className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">

            {/* Step 1: Personal Info — shared by all types */}
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-lg font-black text-white mb-4">Your Information</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">First Name *</label>
                    <input value={form.firstName} onChange={e => set("firstName", e.target.value)} placeholder="James" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">Last Name *</label>
                    <input value={form.lastName} onChange={e => set("lastName", e.target.value)} placeholder="Sullivan" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500" />
                  </div>
                </div>
                {(profileType === "inspector" || profileType === "architect" || profileType === "engineer") && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">Firm / Company Name</label>
                    <input value={form.firmName} onChange={e => set("firmName", e.target.value)} placeholder="Sullivan Inspection Services LLC" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500" />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">Email *</label>
                    <input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="james@email.com" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">Phone</label>
                    <input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="(312) 555-0100" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">City</label>
                    <input value={form.locationCity} onChange={e => set("locationCity", e.target.value)} placeholder="Chicago" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">State</label>
                    <input value={form.locationState} onChange={e => set("locationState", e.target.value)} placeholder="IL" maxLength={2} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">ZIP *</label>
                    <input value={form.locationZip} onChange={e => set("locationZip", e.target.value)} placeholder="60601" maxLength={5} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">Bio / Professional Summary</label>
                  <textarea value={form.bio} onChange={e => set("bio", e.target.value)}
                    placeholder={profileType === "inspector" ? "ICC-certified special inspector with 15 years on healthcare and federal projects. Florida Threshold Inspector license." :
                      profileType === "architect" ? "Licensed architect with 12 years in healthcare and multifamily. LEED AP. Revit and AutoCAD." :
                      profileType === "engineer" ? "PE-licensed structural engineer. 18 years of experience on high-rise and data center projects." :
                      "20-year commercial electrician. IBEW Local 134. Lead Foreman on high-rise and healthcare projects."}
                    rows={3} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 resize-none" />
                </div>
              </div>
            )}

            {/* Step 2: Trade & Skills — for Trade Pro and Sub */}
            {step === 2 && (profileType === "tradepro" || profileType === "sub") && (
              <div className="space-y-4">
                <h2 className="text-lg font-black text-white mb-4">Trade &amp; Experience</h2>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Primary Trade *</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {ALL_TRADES.slice(0, 18).map(trade => (
                      <button key={trade} type="button" onClick={() => set("trade", trade)}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold text-left transition-colors ${form.trade === trade ? "bg-orange-600 text-white border border-orange-500" : "bg-slate-900 text-slate-400 border border-slate-600 hover:border-orange-600/50"}`}>
                        {trade}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">Years Experience *</label>
                    <input value={form.yearsExperience} onChange={e => set("yearsExperience", e.target.value)} placeholder="15" type="number" min="0" max="60" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500" />
                  </div>
                  {profileType === "sub" && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">Crew Size</label>
                      <input value={form.crewSize} onChange={e => set("crewSize", e.target.value)} placeholder="12" type="number" min="1" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500" />
                    </div>
                  )}
                </div>
                {profileType === "sub" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Payroll Type</label>
                    <div className="flex gap-2">
                      {(["direct", "mixed", "1099"] as const).map(type => (
                        <button key={type} type="button" onClick={() => set("payrollType", type)}
                          className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase transition-colors ${form.payrollType === type ? type === "direct" ? "bg-green-700 text-white border border-green-600" : type === "mixed" ? "bg-yellow-700 text-white border border-yellow-600" : "bg-slate-600 text-white border border-slate-500" : "bg-slate-900 text-slate-500 border border-slate-600 hover:border-slate-400"}`}>
                          {type === "direct" ? "Direct Payroll" : type === "mixed" ? "Mixed" : "1099 / Sub"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <MultiSelect label="Sector Experience" options={SECTORS as unknown as string[]} selected={form.sectorExperience} onChange={v => set("sectorExperience", v)} />
                </div>
              </div>
            )}

            {/* Step 2: Credentials — for Inspector */}
            {step === 2 && profileType === "inspector" && (
              <div className="space-y-5">
                <h2 className="text-lg font-black text-white mb-1">License &amp; Certifications</h2>
                <p className="text-sm text-slate-400 mb-3">Your license number is displayed prominently on your Trading Card.</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">License Number *</label>
                    <input value={form.licenseNumber} onChange={e => set("licenseNumber", e.target.value)} placeholder="FL-TI-12345 or ICC #123456" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Licensed States *</label>
                  <div className="grid grid-cols-6 gap-1.5">
                    {US_STATES.map(state => (
                      <button key={state} type="button" onClick={() => {
                        const current = form.licenseStates;
                        set("licenseStates", current.includes(state) ? current.filter(s => s !== state) : [...current, state]);
                      }}
                        className={`py-1 rounded text-xs font-semibold transition-colors ${form.licenseStates.includes(state) ? "bg-green-700 text-white" : "bg-slate-900 text-slate-500 border border-slate-700 hover:border-green-700/50"}`}>
                        {state}
                      </button>
                    ))}
                  </div>
                </div>
                <MultiSelect label="Certifications" options={INSPECTOR_CERTS} selected={form.inspectorCerts} onChange={v => set("inspectorCerts", v)} />
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">Inspection Types Performed</label>
                  <textarea value={form.inspectionTypes.join(", ")} onChange={e => set("inspectionTypes", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                    placeholder="Structural concrete, Reinforcing steel, Bolting, Spray fireproofing, Welding..." rows={2} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 resize-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">Jurisdictions / Counties Covered</label>
                  <input value={form.jurisdictions} onChange={e => set("jurisdictions", e.target.value)} placeholder="Miami-Dade, Broward, Palm Beach counties" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500" />
                </div>
                <MultiSelect label="Sector Experience" options={SECTORS as unknown as string[]} selected={form.sectorExperience} onChange={v => set("sectorExperience", v)} />
              </div>
            )}

            {/* Step 2: Credentials — for Architect */}
            {step === 2 && profileType === "architect" && (
              <div className="space-y-5">
                <h2 className="text-lg font-black text-white mb-4">License &amp; Credentials</h2>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">License Number *</label>
                  <input value={form.licenseNumber} onChange={e => set("licenseNumber", e.target.value)} placeholder="RA-12345" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Licensed States</label>
                  <div className="grid grid-cols-6 gap-1.5">
                    {US_STATES.map(state => (
                      <button key={state} type="button" onClick={() => {
                        const c = form.licenseStates;
                        set("licenseStates", c.includes(state) ? c.filter(s => s !== state) : [...c, state]);
                      }}
                        className={`py-1 rounded text-xs font-semibold transition-colors ${form.licenseStates.includes(state) ? "bg-blue-700 text-white" : "bg-slate-900 text-slate-500 border border-slate-700 hover:border-blue-700/50"}`}>
                        {state}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-slate-900/60 border border-slate-700 rounded-xl p-3">
                  <input type="checkbox" id="aia" checked={form.aiaMember} onChange={e => set("aiaMember", e.target.checked)} className="w-4 h-4 accent-blue-500" />
                  <label htmlFor="aia" className="text-sm text-slate-300 cursor-pointer">AIA Member</label>
                </div>
                <MultiSelect label="Specializations" options={["Healthcare", "Federal / Gov't", "Multifamily", "Historic Preservation", "Education", "Mixed-Use", "Data Centers", "Hospitality", "Industrial"]} selected={form.architectSpecializations} onChange={v => set("architectSpecializations", v)} />
                <MultiSelect label="Software" options={ARCHITECT_SOFTWARE} selected={form.architectSoftware} onChange={v => set("architectSoftware", v)} />
                <MultiSelect label="Additional Certifications" options={ARCHITECT_CERTS} selected={form.oshaSelected} onChange={v => set("oshaSelected", v)} />
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">Years of Experience</label>
                  <input value={form.yearsExperience} onChange={e => set("yearsExperience", e.target.value)} placeholder="12" type="number" min="0" max="60" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500" />
                </div>
                <MultiSelect label="Sector Experience" options={SECTORS as unknown as string[]} selected={form.sectorExperience} onChange={v => set("sectorExperience", v)} />
              </div>
            )}

            {/* Step 2: Credentials — for Engineer */}
            {step === 2 && profileType === "engineer" && (
              <div className="space-y-5">
                <h2 className="text-lg font-black text-white mb-4">Discipline &amp; License</h2>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Engineering Discipline *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {ENGINEER_DISCIPLINES.map(d => (
                      <button key={d} type="button" onClick={() => set("engineerDiscipline", d)}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold text-left transition-colors ${form.engineerDiscipline === d ? "bg-purple-700 text-white border border-purple-600" : "bg-slate-900 text-slate-400 border border-slate-600 hover:border-purple-600/50"}`}>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">PE / EIT License Number</label>
                  <input value={form.peLicenseNumber} onChange={e => set("peLicenseNumber", e.target.value)} placeholder="PE-IL-12345" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Licensed States</label>
                  <div className="grid grid-cols-6 gap-1.5">
                    {US_STATES.map(state => (
                      <button key={state} type="button" onClick={() => {
                        const c = form.licenseStates;
                        set("licenseStates", c.includes(state) ? c.filter(s => s !== state) : [...c, state]);
                      }}
                        className={`py-1 rounded text-xs font-semibold transition-colors ${form.licenseStates.includes(state) ? "bg-purple-700 text-white" : "bg-slate-900 text-slate-500 border border-slate-700 hover:border-purple-700/50"}`}>
                        {state}
                      </button>
                    ))}
                  </div>
                </div>
                <MultiSelect label="Software" options={ENGINEER_SOFTWARE} selected={form.engineerSoftware} onChange={v => set("engineerSoftware", v)} />
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">Years of Experience</label>
                  <input value={form.yearsExperience} onChange={e => set("yearsExperience", e.target.value)} placeholder="18" type="number" min="0" max="60" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500" />
                </div>
                <MultiSelect label="Sector Experience" options={SECTORS as unknown as string[]} selected={form.sectorExperience} onChange={v => set("sectorExperience", v)} />
              </div>
            )}

            {/* Step 3: Certifications & Docs — Trade Pro / Sub */}
            {step === 3 && (profileType === "tradepro" || profileType === "sub") && (
              <div className="space-y-5">
                <h2 className="text-lg font-black text-white mb-1">Certifications &amp; Documents</h2>
                <MultiSelect label="OSHA & Safety Certifications" options={OSHA_CERTS} selected={form.oshaSelected} onChange={v => set("oshaSelected", v)} />
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">Other Certifications / Licenses</label>
                  <input value={form.otherCerts} onChange={e => set("otherCerts", e.target.value)} placeholder="e.g., Journeyman Electrician License — IL, IBEW Local 134, TWIC Card" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500" />
                </div>
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-orange-400">
                    <ShieldCheck className="w-4 h-4" /> Verification Documents (AI-Processed)
                  </div>
                  {profileType === "sub" && (
                    <FileUploadZone label="Bonding Certificate" hint="Upload bonding cert PDF — AI extracts capacity and expiration" file={form.bondingFile} onChange={f => set("bondingFile", f)} />
                  )}
                  <FileUploadZone label="Certificate of Insurance (COI)" hint="Current COI — expiration date tracked automatically" file={form.coiFile} onChange={f => set("coiFile", f)} />
                  <FileUploadZone label="W9 Form" hint="Tax compliance verification" file={form.w9File} onChange={f => set("w9File", f)} />
                </div>
                <div className="flex items-start gap-2 bg-blue-950/30 border border-blue-800/40 rounded-lg p-3">
                  <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-blue-300">Documents are securely stored and only visible to verified GCs you connect with. AI verification typically completes within 60 seconds.</p>
                </div>
              </div>
            )}

            {/* Step 4: Union Membership — Trade Pro / Sub. Fully optional, self-reported. */}
            {step === 4 && (profileType === "tradepro" || profileType === "sub") && (
              <div className="space-y-5">
                <h2 className="text-lg font-black text-white mb-1">Union Membership</h2>
                <p className="text-sm text-slate-400 mb-3">Optional. Adding this shows a Union Member badge on your Trade Card and unlocks union job opportunities — only if you tell us.</p>

                <div className="flex items-center justify-between bg-slate-900/60 border border-slate-700 rounded-xl p-4">
                  <div>
                    <p className="text-sm font-semibold text-white flex items-center gap-1.5"><Shield className="w-4 h-4 text-blue-400" /> Union Member</p>
                    <p className="text-xs text-slate-500 mt-0.5">Self-reported. Never auto-assigned.</p>
                  </div>
                  <button type="button" onClick={() => set("unionMember", !form.unionMember)}
                    className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${form.unionMember ? "bg-blue-600" : "bg-slate-700"}`}>
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${form.unionMember ? "translate-x-5" : ""}`} />
                  </button>
                </div>

                {form.unionMember && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">Union Name</label>
                        <select value={form.unionName} onChange={e => set("unionName", e.target.value)}
                          className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500">
                          <option value="">Select union…</option>
                          {UNION_NAMES.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">Local Number</label>
                        <input value={form.unionLocalNumber} onChange={e => set("unionLocalNumber", e.target.value)} placeholder="Local 349" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">Member Status</label>
                        <select value={form.unionMemberStatus} onChange={e => set("unionMemberStatus", e.target.value)}
                          className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500">
                          <option value="">Select status…</option>
                          {UNION_MEMBER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">Union Card Expiration</label>
                        <input type="date" value={form.unionCardExpiration} onChange={e => set("unionCardExpiration", e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500" />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 bg-slate-900/60 border border-slate-700 rounded-xl p-3">
                      <input type="checkbox" id="prevailingWage" checked={form.prevailingWageCertified} onChange={e => set("prevailingWageCertified", e.target.checked)} className="w-4 h-4 accent-blue-500" />
                      <label htmlFor="prevailingWage" className="text-sm text-slate-300 cursor-pointer">Prevailing Wage Certified</label>
                    </div>
                    <div className="flex items-center gap-3 bg-slate-900/60 border border-slate-700 rounded-xl p-3">
                      <input type="checkbox" id="davisBacon" checked={form.davisBaconEligible} onChange={e => set("davisBaconEligible", e.target.checked)} className="w-4 h-4 accent-blue-500" />
                      <label htmlFor="davisBacon" className="text-sm text-slate-300 cursor-pointer">Davis-Bacon Eligible</label>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3 (for inspector/architect/engineer) = Step 2 → Availability is step 3 for non-tradepro */}
            {/* Availability — for inspector/architect/engineer at step 3, tradepro/sub at step 5 */}
            {((step === 3 && (profileType === "inspector" || profileType === "architect" || profileType === "engineer")) ||
              (step === 5 && (profileType === "tradepro" || profileType === "sub"))) && (
              <div className="space-y-5">
                <h2 className="text-lg font-black text-white mb-4">Availability</h2>
                <div className="space-y-2">
                  {[
                    { value: "available", label: "Available Now", desc: "Ready for new projects immediately", color: "green" },
                    { value: "available_soon", label: "Available Soon", desc: "Current project wrapping up — available in weeks", color: "yellow" },
                    { value: "booked", label: "Fully Booked", desc: "No current capacity — still visible for future projects", color: "red" },
                  ].map(opt => (
                    <button key={opt.value} type="button" onClick={() => set("availabilityStatus", opt.value as FormData["availabilityStatus"])}
                      className={`w-full flex items-start gap-3 px-4 py-3 rounded-xl border text-left transition-colors ${form.availabilityStatus === opt.value ?
                        opt.color === "green" ? "border-green-600 bg-green-950/30" : opt.color === "yellow" ? "border-yellow-600 bg-yellow-950/30" : "border-red-800 bg-red-950/20"
                        : "border-slate-600 bg-slate-900/50 hover:border-slate-500"}`}>
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${form.availabilityStatus === opt.value ?
                        opt.color === "green" ? "bg-green-400" : opt.color === "yellow" ? "bg-yellow-400" : "bg-red-400" : "bg-slate-600"}`} />
                      <div><p className="text-sm font-semibold text-white">{opt.label}</p><p className="text-xs text-slate-400">{opt.desc}</p></div>
                    </button>
                  ))}
                </div>
                {form.availabilityStatus === "available_soon" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">Available in how many weeks?</label>
                    <input value={form.availableInWeeks} onChange={e => set("availableInWeeks", e.target.value)} placeholder="3" type="number" min="1" max="52" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500" />
                  </div>
                )}
              </div>
            )}

            {/* Photos — last step for all types */}
            {((step === 4 && (profileType === "inspector" || profileType === "architect" || profileType === "engineer")) ||
              (step === 6 && (profileType === "tradepro" || profileType === "sub"))) && (
              <div className="space-y-4">
                <h2 className="text-lg font-black text-white mb-1">Work Notoriety Gallery</h2>
                <p className="text-sm text-slate-400 mb-4">
                  {profileType === "inspector" ? "Photos of inspections, reports, or jobsite work. Shows GCs your experience." :
                    profileType === "architect" ? "Renderings, completed projects, or construction photos. Your strongest trust signal." :
                    profileType === "engineer" ? "Project photos, drawings, or completed work. Shows GCs your portfolio." :
                    "Up to 10 photos. Jobsite progress, completed installs, crew in action."}
                </p>
                <div className="border-2 border-dashed border-slate-600 hover:border-orange-600 rounded-xl p-8 text-center cursor-pointer transition-colors bg-slate-900/40"
                  onClick={() => document.getElementById("gallery-upload")?.click()}>
                  <input id="gallery-upload" type="file" accept="image/*" multiple capture="environment" className="hidden"
                    onChange={e => { const files = Array.from(e.target.files || []); set("galleryFiles", [...form.galleryFiles, ...files].slice(0, 10)); }} />
                  <ImageIcon className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-400 mb-1">Drop photos or tap to upload</p>
                  <p className="text-xs text-slate-600">{form.galleryFiles.length}/10 uploaded.</p>
                </div>
                {form.galleryFiles.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {form.galleryFiles.map((file, i) => (
                      <div key={i} className="relative group aspect-square rounded-lg overflow-hidden bg-slate-800 border border-slate-700">
                        <img src={URL.createObjectURL(file)} alt={file.name} className="w-full h-full object-cover" />
                        <button onClick={() => set("galleryFiles", form.galleryFiles.filter((_, j) => j !== i))}
                          className="absolute top-1 right-1 w-6 h-6 bg-red-600/90 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors">
                          <X className="w-3.5 h-3.5 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <button onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1 || submitting}
            className="flex items-center gap-2 px-4 py-2.5 border border-slate-600 text-slate-400 hover:text-white hover:border-slate-400 rounded-xl text-sm font-semibold transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>

          {step < totalSteps ? (
            <button onClick={() => setStep(step + 1)} disabled={!canProceed()}
              className="flex items-center gap-2 px-6 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Publishing…</> : <>Publish Trading Card <ArrowRight className="w-4 h-4" /></>}
            </button>
          )}
        </div>

        {submitError && (
          <div className="mt-4 bg-red-950/40 border border-red-800/50 text-red-400 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />{submitError}
          </div>
        )}

        <p className="text-center text-xs text-slate-600 mt-4">
          Step {step} of {totalSteps} · Free forever · No subscription
        </p>
      </div>
    </div>
  );
}
