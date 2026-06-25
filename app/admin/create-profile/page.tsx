"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  User, Mail, Phone, Briefcase, MapPin, Users,
  Shield, Award, CheckCircle, Loader2, ArrowRight,
  AlertCircle, ExternalLink
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import { ALL_TRADES } from "@/lib/constants";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

type Result = {
  slug: string;
  profileUrl: string;
  userId: string;
  magicLink: string;
};

export default function AdminCreateProfilePage() {
  const router = useRouter();

  // Auth gate
  const [authed, setAuthed] = useState<boolean | null>(null);
  useState(() => {
    getSupabase()?.auth.getUser().then(({ data: { user } }) => {
      if (user?.email !== "andrew@tradeprotech.ai") {
        router.replace("/");
      } else {
        setAuthed(true);
      }
    });
  });

  const [form, setForm] = useState({
    firstName: "", lastName: "", businessName: "", email: "", phone: "",
    trade: "", city: "", state: "", yearsExperience: "", crewSize: "",
    unionMember: false, unionName: "", unionLocalNumber: "",
    certifications: "", availableForWork: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/create-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setResult(data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function copyMagicLink() {
    if (!result) return;
    navigator.clipboard.writeText(result.magicLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function resetForm() {
    setForm({
      firstName: "", lastName: "", businessName: "", email: "", phone: "",
      trade: "", city: "", state: "", yearsExperience: "", crewSize: "",
      unionMember: false, unionName: "", unionLocalNumber: "",
      certifications: "", availableForWork: true,
    });
    setResult(null);
    setError(null);
  }

  if (authed === null) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const input = "w-full bg-slate-900 border border-slate-600 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500";
  const label = "block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5";

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-16">

        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <User className="w-5 h-5 text-orange-400" />
          <h1 className="text-xl font-black text-white">Create Profile</h1>
        </div>
        <p className="text-slate-400 text-sm mb-3">
          Manually create a fully claimed profile for a contractor contact.
        </p>

        {/* Admin note */}
        <div className="bg-amber-950/30 border border-amber-800/50 rounded-xl px-4 py-3 mb-6 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-amber-300 text-xs leading-relaxed">
            Profiles created here are real accounts. The contractor will receive a welcome email
            and magic login link immediately after you hit submit.
          </p>
        </div>

        {/* Success state */}
        {result && (
          <div className="bg-green-950/30 border border-green-700/50 rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <p className="font-black text-white">Profile created. Emails sent.</p>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Trade Card URL</p>
                <div className="flex items-center gap-2">
                  <p className="text-orange-400 font-mono text-sm flex-1 truncate">{result.profileUrl}</p>
                  <a href={result.profileUrl} target="_blank" rel="noopener noreferrer"
                    className="text-slate-400 hover:text-white transition-colors flex-shrink-0">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Magic Login Link</p>
                <div className="flex items-center gap-2">
                  <p className="text-slate-300 font-mono text-xs flex-1 truncate">{result.magicLink.slice(0, 60)}…</p>
                  <button onClick={copyMagicLink}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-600 text-slate-300 hover:text-white hover:border-slate-400 transition-colors flex-shrink-0">
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <p className="text-[10px] text-slate-600 mt-1">Already emailed to them. Valid 24 hours.</p>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <Link href={result.profileUrl} target="_blank"
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold rounded-xl transition-colors">
                View Profile <ExternalLink className="w-3.5 h-3.5" />
              </Link>
              <button onClick={resetForm}
                className="flex-1 px-4 py-2.5 border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white text-sm font-semibold rounded-xl transition-colors">
                Create Another
              </button>
            </div>
          </div>
        )}

        {/* Form */}
        {!result && (
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}><User className="w-3 h-3 inline mr-1" />First Name *</label>
                <input value={form.firstName} onChange={e => set("firstName", e.target.value)}
                  required placeholder="Marcus" className={input} />
              </div>
              <div>
                <label className={label}>Last Name *</label>
                <input value={form.lastName} onChange={e => set("lastName", e.target.value)}
                  required placeholder="Hall" className={input} />
              </div>
            </div>

            {/* Business name */}
            <div>
              <label className={label}><Briefcase className="w-3 h-3 inline mr-1" />Business Name</label>
              <input value={form.businessName} onChange={e => set("businessName", e.target.value)}
                placeholder="Hall Electric LLC" className={input} />
              <p className="text-[10px] text-slate-600 mt-1">Used to match and claim an existing registry listing.</p>
            </div>

            {/* Contact row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}><Mail className="w-3 h-3 inline mr-1" />Email Address *</label>
                <input type="email" value={form.email} onChange={e => set("email", e.target.value)}
                  required placeholder="marcus@hallelectric.com" className={input} />
              </div>
              <div>
                <label className={label}><Phone className="w-3 h-3 inline mr-1" />Phone</label>
                <input type="tel" value={form.phone} onChange={e => set("phone", e.target.value)}
                  placeholder="(813) 555-0100" className={input} />
              </div>
            </div>

            {/* Trade */}
            <div>
              <label className={label}><Briefcase className="w-3 h-3 inline mr-1" />Trade *</label>
              <select value={form.trade} onChange={e => set("trade", e.target.value)}
                required className={input}>
                <option value="">Select a trade</option>
                {ALL_TRADES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Location row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}><MapPin className="w-3 h-3 inline mr-1" />City</label>
                <input value={form.city} onChange={e => set("city", e.target.value)}
                  placeholder="Tampa" className={input} />
              </div>
              <div>
                <label className={label}>State</label>
                <select value={form.state} onChange={e => set("state", e.target.value)} className={input}>
                  <option value="">Select state</option>
                  {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Experience + crew row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}><Award className="w-3 h-3 inline mr-1" />Years of Experience</label>
                <input type="number" min="0" max="60" value={form.yearsExperience}
                  onChange={e => set("yearsExperience", e.target.value)}
                  placeholder="14" className={input} />
              </div>
              <div>
                <label className={label}><Users className="w-3 h-3 inline mr-1" />Crew Size</label>
                <input type="number" min="1" max="500" value={form.crewSize}
                  onChange={e => set("crewSize", e.target.value)}
                  placeholder="8" className={input} />
              </div>
            </div>

            {/* Union section */}
            <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4 space-y-3">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={form.unionMember}
                  onChange={e => set("unionMember", e.target.checked)}
                  className="w-4 h-4 accent-blue-500" />
                <span className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-blue-400" /> Union Member
                </span>
              </label>
              {form.unionMember && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className={label}>Union Name</label>
                    <input value={form.unionName} onChange={e => set("unionName", e.target.value)}
                      placeholder="IBEW" className={input} />
                  </div>
                  <div>
                    <label className={label}>Local Number</label>
                    <input value={form.unionLocalNumber} onChange={e => set("unionLocalNumber", e.target.value)}
                      placeholder="824" className={input} />
                  </div>
                </div>
              )}
            </div>

            {/* Certifications */}
            <div>
              <label className={label}>Certifications <span className="text-slate-600 font-normal normal-case">(optional, comma separated)</span></label>
              <input value={form.certifications} onChange={e => set("certifications", e.target.value)}
                placeholder="OSHA 30, NFPA 70E, Arc Flash" className={input} />
            </div>

            {/* Availability */}
            <div className="flex items-center justify-between bg-slate-800/40 border border-slate-700/40 rounded-xl px-4 py-3">
              <span className="text-sm font-semibold text-slate-200">Available for Work</span>
              <button type="button" onClick={() => set("availableForWork", !form.availableForWork)}
                className={`relative w-11 h-6 rounded-full transition-colors ${form.availableForWork ? "bg-green-600" : "bg-slate-600"}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.availableForWork ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>

            {error && (
              <div className="bg-red-950/40 border border-red-800/50 text-red-400 text-sm rounded-xl px-4 py-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <button type="submit" disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-black rounded-xl text-base transition-colors">
              {submitting
                ? <><Loader2 className="w-5 h-5 animate-spin" /> Creating profile and sending emails…</>
                : <><CheckCircle className="w-5 h-5" /> Create Profile and Send Welcome Email <ArrowRight className="w-4 h-4" /></>
              }
            </button>

          </form>
        )}

      </div>
    </div>
  );
}
