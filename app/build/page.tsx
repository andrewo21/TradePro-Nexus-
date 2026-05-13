"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HardHat, ChevronRight, ChevronLeft, Upload, CheckCircle,
  User, Briefcase, ShieldCheck, ImageIcon, Calendar, ArrowRight,
  AlertCircle, X
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Link from "next/link";

const TRADES = [
  "Electrician", "Plumber", "HVAC Technician", "Ironworker",
  "Carpenter", "Concrete / Masonry", "Roofer", "Painter",
  "Fire Protection", "Sheet Metal", "Pipefitter", "Superintendent",
  "Project Manager", "Site Superintendent", "Estimator", "Other",
];

const OSHA_CERTS = [
  "OSHA 10 — Construction",
  "OSHA 30 — Construction",
  "OSHA 10 — General Industry",
  "OSHA 30 — General Industry",
  "Fall Protection",
  "Confined Space",
  "Forklift / Equipment Operator",
  "First Aid / CPR",
];

const STEPS = [
  { id: 1, label: "Your Info", icon: User },
  { id: 2, label: "Trade & Skills", icon: Briefcase },
  { id: 3, label: "Certifications", icon: ShieldCheck },
  { id: 4, label: "Availability", icon: Calendar },
  { id: 5, label: "Work Photos", icon: ImageIcon },
];

interface FormData {
  firstName: string;
  lastName: string;
  trade: string;
  yearsExperience: string;
  locationCity: string;
  locationState: string;
  locationZip: string;
  phone: string;
  email: string;
  bio: string;
  oshaSelected: string[];
  otherCerts: string;
  payrollType: "direct" | "mixed" | "1099";
  availabilityStatus: "available" | "available_soon" | "booked";
  availableInWeeks: string;
  crewSize: string;
  isLeadForeman: boolean;
  galleryFiles: File[];
  bondingFile: File | null;
  coiFile: File | null;
  w9File: File | null;
}

const defaultForm: FormData = {
  firstName: "",
  lastName: "",
  trade: "",
  yearsExperience: "",
  locationCity: "",
  locationState: "",
  locationZip: "",
  phone: "",
  email: "",
  bio: "",
  oshaSelected: [],
  otherCerts: "",
  payrollType: "direct",
  availabilityStatus: "available",
  availableInWeeks: "",
  crewSize: "",
  isLeadForeman: false,
  galleryFiles: [],
  bondingFile: null,
  coiFile: null,
  w9File: null,
};

function FileUploadZone({
  label,
  hint,
  file,
  onChange,
  accept = ".pdf,.jpg,.jpeg,.png",
}: {
  label: string;
  hint: string;
  file: File | null;
  onChange: (f: File | null) => void;
  accept?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-300 mb-1">{label}</label>
      <div
        className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
          file
            ? "border-green-600 bg-green-950/20"
            : "border-slate-600 hover:border-orange-600 bg-slate-800/40"
        }`}
        onClick={() => document.getElementById(`file-${label.replace(/\s/g, "")}`)?.click()}
      >
        <input
          id={`file-${label.replace(/\s/g, "")}`}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        />
        {file ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-medium">{file.name}</span>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onChange(null); }}
              className="text-slate-400 hover:text-red-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div>
            <Upload className="w-6 h-6 text-slate-500 mx-auto mb-1" />
            <p className="text-xs text-slate-400">{hint}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BuildPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(defaultForm);
  const [submitted, setSubmitted] = useState(false);

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleOsha(cert: string) {
    set(
      "oshaSelected",
      form.oshaSelected.includes(cert)
        ? form.oshaSelected.filter((c) => c !== cert)
        : [...form.oshaSelected, cert]
    );
  }

  function handleGalleryFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    set("galleryFiles", [...form.galleryFiles, ...files].slice(0, 10));
  }

  function removeGallery(index: number) {
    set("galleryFiles", form.galleryFiles.filter((_, i) => i !== index));
  }

  function canProceed(): boolean {
    if (step === 1) return !!(form.firstName && form.lastName && form.email && form.locationZip);
    if (step === 2) return !!(form.trade && form.yearsExperience);
    return true;
  }

  function handleSubmit() {
    setSubmitted(true);
  }

  const slug = `${form.firstName.toLowerCase()}-${form.lastName.toLowerCase()}`.replace(/\s+/g, "-");

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-slate-100">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-lg w-full text-center"
          >
            <div className="w-16 h-16 bg-green-600/20 border border-green-600/40 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <h2 className="text-2xl font-black text-white mb-2">Your Trade Card is Live!</h2>
            <p className="text-slate-400 mb-6">
              Documents are being processed for AI verification. Your profile is pending review
              and will be visible to GCs once verified — typically within minutes.
            </p>
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 mb-6 text-left">
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Your Public URL</p>
              <p className="text-orange-400 font-mono font-bold">tradepronexus.com/pro/{slug || "your-name"}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href={`/pro/${slug || "preview"}`}
                className="flex-1 px-5 py-3 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-xl text-sm transition-colors text-center"
              >
                View My Trade Card
              </Link>
              <Link
                href="/"
                className="flex-1 px-5 py-3 border border-slate-600 text-slate-300 rounded-xl text-sm transition-colors text-center hover:border-slate-400"
              >
                Back to Home
              </Link>
            </div>
          </motion.div>
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
          <div className="w-10 h-10 bg-orange-600/20 border border-orange-600/40 rounded-xl flex items-center justify-center">
            <HardHat className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Build Your Digital Trade Card</h1>
            <p className="text-sm text-slate-400">Your free capability statement — visible to $30M+ GCs</p>
          </div>
        </div>

        {/* Step progress */}
        <div className="flex items-center gap-1 mb-8">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const active = s.id === step;
            const done = s.id < step;
            return (
              <div key={s.id} className="flex items-center gap-1 flex-1">
                <div
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors flex-1 ${
                    active ? "bg-orange-600 text-white" :
                    done ? "bg-green-700/30 text-green-400" :
                    "bg-slate-800 text-slate-500"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="hidden sm:block truncate">{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`w-3 h-0.5 rounded-full flex-shrink-0 ${done ? "bg-green-600" : "bg-slate-700"}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6"
          >

            {/* ── Step 1: Personal Info ── */}
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-white mb-4">Your Information</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">First Name *</label>
                    <input
                      value={form.firstName}
                      onChange={(e) => set("firstName", e.target.value)}
                      placeholder="Marcus"
                      className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">Last Name *</label>
                    <input
                      value={form.lastName}
                      onChange={(e) => set("lastName", e.target.value)}
                      placeholder="Thompson"
                      className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">Phone</label>
                    <input
                      value={form.phone}
                      onChange={(e) => set("phone", e.target.value)}
                      placeholder="(312) 555-0100"
                      className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">Email *</label>
                    <input
                      value={form.email}
                      onChange={(e) => set("email", e.target.value)}
                      placeholder="marcus@email.com"
                      type="email"
                      className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">City</label>
                    <input
                      value={form.locationCity}
                      onChange={(e) => set("locationCity", e.target.value)}
                      placeholder="Chicago"
                      className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">State</label>
                    <input
                      value={form.locationState}
                      onChange={(e) => set("locationState", e.target.value)}
                      placeholder="IL"
                      maxLength={2}
                      className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">ZIP *</label>
                    <input
                      value={form.locationZip}
                      onChange={(e) => set("locationZip", e.target.value)}
                      placeholder="60601"
                      maxLength={5}
                      className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">Bio / Professional Summary</label>
                  <textarea
                    value={form.bio}
                    onChange={(e) => set("bio", e.target.value)}
                    placeholder="20-year commercial electrician. Specialty in high-rise and healthcare facilities. IBEW Local 134."
                    rows={3}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 resize-none"
                  />
                </div>
              </div>
            )}

            {/* ── Step 2: Trade & Skills ── */}
            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-white mb-4">Trade &amp; Experience</h2>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Primary Trade *</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {TRADES.map((trade) => (
                      <button
                        key={trade}
                        onClick={() => set("trade", trade)}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold text-left transition-colors ${
                          form.trade === trade
                            ? "bg-orange-600 text-white border border-orange-500"
                            : "bg-slate-900 text-slate-400 border border-slate-600 hover:border-orange-600/50"
                        }`}
                      >
                        {trade}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">Years of Experience *</label>
                    <input
                      value={form.yearsExperience}
                      onChange={(e) => set("yearsExperience", e.target.value)}
                      placeholder="15"
                      type="number"
                      min="0"
                      max="60"
                      className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">Crew Size</label>
                    <input
                      value={form.crewSize}
                      onChange={(e) => set("crewSize", e.target.value)}
                      placeholder="12"
                      type="number"
                      min="1"
                      className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Payroll Type</label>
                  <div className="flex gap-2">
                    {(["direct", "mixed", "1099"] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => set("payrollType", type)}
                        className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors ${
                          form.payrollType === type
                            ? type === "direct" ? "bg-green-700 text-white border border-green-600"
                            : type === "mixed" ? "bg-yellow-700 text-white border border-yellow-600"
                            : "bg-slate-600 text-white border border-slate-500"
                            : "bg-slate-900 text-slate-500 border border-slate-600 hover:border-slate-400"
                        }`}
                      >
                        {type === "direct" ? "Direct Payroll" : type === "mixed" ? "Mixed" : "1099 / Sub"}
                      </button>
                    ))}
                  </div>
                  {form.payrollType === "direct" && (
                    <p className="text-xs text-green-400 mt-1.5 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Direct payroll workers rank higher in GC match results.
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 bg-slate-900/60 border border-slate-700 rounded-xl p-3">
                  <input
                    type="checkbox"
                    id="foreman"
                    checked={form.isLeadForeman}
                    onChange={(e) => set("isLeadForeman", e.target.checked)}
                    className="w-4 h-4 accent-orange-500"
                  />
                  <label htmlFor="foreman" className="text-sm text-slate-300 cursor-pointer">
                    I am a <strong className="text-orange-400">Lead Foreman</strong> — GCs will see my Trade Card as the face of my crew.
                  </label>
                </div>
              </div>
            )}

            {/* ── Step 3: Certifications & Documents ── */}
            {step === 3 && (
              <div className="space-y-5">
                <h2 className="text-lg font-bold text-white mb-1">Certifications &amp; Verification Docs</h2>
                <p className="text-sm text-slate-400 mb-4">
                  AI reads and verifies your documents automatically. Verified profiles rank higher in GC searches.
                </p>

                {/* OSHA */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">OSHA &amp; Safety Certifications</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {OSHA_CERTS.map((cert) => (
                      <button
                        key={cert}
                        onClick={() => toggleOsha(cert)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors ${
                          form.oshaSelected.includes(cert)
                            ? "bg-green-900/40 text-green-400 border border-green-700"
                            : "bg-slate-900 text-slate-400 border border-slate-600 hover:border-slate-500"
                        }`}
                      >
                        <CheckCircle className={`w-4 h-4 flex-shrink-0 ${form.oshaSelected.includes(cert) ? "text-green-400" : "text-slate-600"}`} />
                        {cert}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">Other Certifications / Licenses</label>
                  <input
                    value={form.otherCerts}
                    onChange={(e) => set("otherCerts", e.target.value)}
                    placeholder="e.g., Journeyman Electrician License, TWIC Card, Crane Operator"
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                  />
                </div>

                {/* Document uploads */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-orange-400">
                    <ShieldCheck className="w-4 h-4" /> Verification Documents (AI-Processed)
                  </div>
                  <FileUploadZone
                    label="Bonding Certificate"
                    hint="Upload your bonding cert PDF — AI extracts capacity and expiration"
                    file={form.bondingFile}
                    onChange={(f) => set("bondingFile", f)}
                  />
                  <FileUploadZone
                    label="Certificate of Insurance (COI)"
                    hint="Current COI — expiration date tracked automatically"
                    file={form.coiFile}
                    onChange={(f) => set("coiFile", f)}
                  />
                  <FileUploadZone
                    label="W9 Form"
                    hint="Tax compliance verification"
                    file={form.w9File}
                    onChange={(f) => set("w9File", f)}
                  />
                </div>

                <div className="flex items-start gap-2 bg-blue-950/30 border border-blue-800/40 rounded-lg p-3">
                  <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-blue-300">
                    Documents are securely stored and only visible to you and verified GCs you connect with.
                    AI verification typically completes within 60 seconds.
                  </p>
                </div>
              </div>
            )}

            {/* ── Step 4: Availability ── */}
            {step === 4 && (
              <div className="space-y-5">
                <h2 className="text-lg font-bold text-white mb-4">Availability &amp; Capacity</h2>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Current Availability</label>
                  <div className="space-y-2">
                    {[
                      { value: "available", label: "Available Now", desc: "Ready to mobilize for new projects immediately", color: "green" },
                      { value: "available_soon", label: "Available Soon", desc: "Current project wrapping up — available in weeks", color: "yellow" },
                      { value: "booked", label: "Fully Booked", desc: "No current capacity — still visible for future projects", color: "red" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => set("availabilityStatus", opt.value as FormData["availabilityStatus"])}
                        className={`w-full flex items-start gap-3 px-4 py-3 rounded-xl border text-left transition-colors ${
                          form.availabilityStatus === opt.value
                            ? opt.color === "green" ? "border-green-600 bg-green-950/30"
                            : opt.color === "yellow" ? "border-yellow-600 bg-yellow-950/30"
                            : "border-red-800 bg-red-950/20"
                            : "border-slate-600 bg-slate-900/50 hover:border-slate-500"
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                          form.availabilityStatus === opt.value
                            ? opt.color === "green" ? "bg-green-400" : opt.color === "yellow" ? "bg-yellow-400" : "bg-red-400"
                            : "bg-slate-600"
                        }`} />
                        <div>
                          <p className="text-sm font-semibold text-white">{opt.label}</p>
                          <p className="text-xs text-slate-400">{opt.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                {form.availabilityStatus === "available_soon" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">Available in how many weeks?</label>
                    <input
                      value={form.availableInWeeks}
                      onChange={(e) => set("availableInWeeks", e.target.value)}
                      placeholder="3"
                      type="number"
                      min="1"
                      max="52"
                      className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                )}
              </div>
            )}

            {/* ── Step 5: Work Photos ── */}
            {step === 5 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-white mb-1">Work Notoriety Gallery</h2>
                <p className="text-sm text-slate-400 mb-4">
                  Up to 10 photos. Show the real work — jobsite progress, completed installs, crew in action.
                  Photos are your strongest trust signal with GCs.
                </p>

                <div
                  className="border-2 border-dashed border-slate-600 hover:border-orange-600 rounded-xl p-8 text-center cursor-pointer transition-colors bg-slate-900/40"
                  onClick={() => document.getElementById("gallery-upload")?.click()}
                >
                  <input
                    id="gallery-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleGalleryFiles}
                  />
                  <ImageIcon className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-400 mb-1">Drop photos here or click to upload</p>
                  <p className="text-xs text-slate-600">JPG, PNG — up to 10 photos. {form.galleryFiles.length}/10 uploaded.</p>
                </div>

                {form.galleryFiles.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {form.galleryFiles.map((file, i) => (
                      <div key={i} className="relative group aspect-square rounded-lg overflow-hidden bg-slate-800 border border-slate-700">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => removeGallery(i)}
                          className="absolute top-1 right-1 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Profile preview */}
                <div className="mt-4 bg-slate-900/60 border border-slate-700 rounded-xl p-4">
                  <p className="text-xs text-slate-500 uppercase tracking-widest mb-3 font-semibold">Preview — Your Trade Card</p>
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-orange-600/20 border border-orange-600/40 rounded-xl flex items-center justify-center font-black text-orange-400 text-lg flex-shrink-0">
                      {form.firstName.slice(0, 1)}{form.lastName.slice(0, 1)}
                    </div>
                    <div>
                      <p className="font-bold text-white">{form.firstName || "Your"} {form.lastName || "Name"}</p>
                      <p className="text-orange-400 text-sm">{form.trade || "Your Trade"}</p>
                      <p className="text-slate-400 text-xs">{form.locationCity || "City"}, {form.locationState || "ST"} · {form.yearsExperience || "0"} yrs exp</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          form.availabilityStatus === "available" ? "text-green-400 bg-green-900/30 border-green-800/50" :
                          form.availabilityStatus === "available_soon" ? "text-yellow-400 bg-yellow-900/30 border-yellow-800/50" :
                          "text-red-400 bg-red-900/30 border-red-800/50"
                        }`}>
                          {form.availabilityStatus === "available" ? "Available Now" :
                           form.availabilityStatus === "available_soon" ? `Available in ${form.availableInWeeks || "?"} wks` :
                           "Booked"}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          form.payrollType === "direct" ? "text-green-400 bg-green-900/30 border-green-800/50" :
                          form.payrollType === "mixed" ? "text-yellow-400 bg-yellow-900/30 border-yellow-800/50" :
                          "text-slate-400 bg-slate-800 border-slate-700"
                        }`}>
                          {form.payrollType === "direct" ? "Direct Payroll" : form.payrollType === "mixed" ? "Mixed" : "1099"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
            className="flex items-center gap-2 px-4 py-2.5 border border-slate-600 text-slate-400 hover:text-white hover:border-slate-400 rounded-xl text-sm font-semibold transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>

          {step < STEPS.length ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="flex items-center gap-2 px-6 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl text-sm font-bold transition-colors"
            >
              Publish Trade Card <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        <p className="text-center text-xs text-slate-600 mt-4">
          Step {step} of {STEPS.length} · Free forever · No subscription
        </p>
      </div>
    </div>
  );
}
