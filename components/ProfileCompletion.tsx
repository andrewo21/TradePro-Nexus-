"use client";

// Shows profile completion % and what's missing.
// Displayed on the /account page for logged-in Trade Pros.
// Design choice: percentage ring + checklist, tapping any missing item
// links directly to the relevant step on the build form.

import { useEffect } from "react";
import { canBeVerified } from "@/lib/constants";
import { trackEvent } from "@/lib/analytics";

interface ProfileRow {
  id: string;
  first_name: string;
  last_name: string;
  slug: string;
  profile_type: string;
  trade: string | null;
  years_experience: number | null;
  location_zip: string | null;
  location_city: string | null;
  bio: string | null;
  phone: string | null;
  avatar_url: string | null;
  gallery_urls: string[] | null;
  osha_certifications: string[] | null;
  other_certifications: string[] | null;
  verification_status: string;
  license_number: string | null;
  type_data: Record<string, unknown> | null;
  availability_status: string;
}

interface CheckItem {
  label: string;
  done: boolean;
  points: number;
  hint: string;
}

function buildChecklist(profile: ProfileRow): CheckItem[] {
  const isTradeOrSub = profile.profile_type === "tradepro" || profile.profile_type === "sub";
  const isLicensed = profile.profile_type === "inspector" || profile.profile_type === "architect" || profile.profile_type === "engineer";
  const typeData = profile.type_data ?? {};

  return [
    {
      label: "Name and email",
      done: !!(profile.first_name && profile.last_name),
      points: 10,
      hint: "Already set from your account — nothing to do.",
    },
    {
      label: "Location (city + ZIP)",
      done: !!(profile.location_city && profile.location_zip),
      points: 10,
      hint: "Add your city and ZIP so GCs can find local talent.",
    },
    {
      label: "Phone number",
      done: !!profile.phone,
      points: 5,
      hint: "GCs use this to reach you directly.",
    },
    {
      label: "Bio / professional summary",
      done: !!(profile.bio && profile.bio.length > 40),
      points: 10,
      hint: "At least 40 characters — describe your specialty and experience.",
    },
    ...(isTradeOrSub ? [
      {
        label: "Primary trade",
        done: !!profile.trade,
        points: 15,
        hint: "Your trade is the first thing GCs filter by.",
      },
      {
        label: "Years of experience",
        done: !!(profile.years_experience && profile.years_experience > 0),
        points: 10,
        hint: "Helps GCs match your experience to their project size.",
      },
      {
        label: "OSHA or safety certifications",
        done: !!(profile.osha_certifications && profile.osha_certifications.length > 0),
        points: 10,
        hint: "Even one cert significantly improves your search ranking.",
      },
    ] : []),
    ...(isLicensed ? [
      {
        label: "License number",
        done: !!profile.license_number,
        points: 20,
        hint: "Prominently displayed — required for verified search results.",
      },
      {
        label: "Licensed states",
        done: Array.isArray((typeData as any).license_states) ? (typeData as any).license_states.length > 0 : false,
        points: 10,
        hint: "GCs search by jurisdiction — list every state you're licensed in.",
      },
      {
        label: profile.profile_type === "inspector" ? "Inspection types" : profile.profile_type === "engineer" ? "Engineering discipline" : "Specializations",
        done: profile.profile_type === "engineer"
          ? !!(typeData as any).discipline
          : Array.isArray((typeData as any).inspection_types || (typeData as any).specializations)
            ? ((typeData as any).inspection_types || (typeData as any).specializations || []).length > 0
            : false,
        points: 10,
        hint: "Helps GCs understand exactly what you do.",
      },
    ] : []),
    {
      label: "Work photos (at least 3)",
      done: !!(profile.gallery_urls && profile.gallery_urls.length >= 3),
      points: 15,
      hint: "Photos are your strongest trust signal. GCs want to see real work.",
    },
    ...(canBeVerified(profile.profile_type) ? [
      {
        label: "Verification submitted",
        done: profile.verification_status !== "pending" || false,
        points: 5,
        hint: "Start the $99 verification to get the Verified badge and appear in GC searches.",
      },
    ] : []),
  ];
}

export default function ProfileCompletion({ profile }: { profile: ProfileRow }) {
  const checklist = buildChecklist(profile);
  const totalPoints = checklist.reduce((s, c) => s + c.points, 0);
  const earnedPoints = checklist.filter(c => c.done).reduce((s, c) => s + c.points, 0);
  const pct = Math.round((earnedPoints / totalPoints) * 100);
  const missing = checklist.filter(c => !c.done);

  useEffect(() => {
    if (pct !== 100) return;
    const key = `ga_profile_complete_${profile.id}`;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
    trackEvent("profile_complete");
  }, [pct, profile.id]);

  if (pct === 100) return null; // Don't show if complete

  const circumference = 2 * Math.PI * 28;
  const dash = (pct / 100) * circumference;

  const ringColor = pct >= 80 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#ea580c";

  return (
    <div className="bg-slate-800 border border-slate-600 rounded-2xl p-5 mb-4">
      <div className="flex items-center gap-4 mb-4">
        {/* Progress ring */}
        <div className="flex-shrink-0 relative w-16 h-16">
          <svg viewBox="0 0 64 64" className="w-16 h-16 -rotate-90">
            <circle cx="32" cy="32" r="28" fill="none" stroke="#334155" strokeWidth="6" />
            <circle
              cx="32" cy="32" r="28"
              fill="none"
              stroke={ringColor}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circumference}`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-black text-white">{pct}%</span>
          </div>
        </div>

        <div>
          <h3 className="font-black text-white mb-0.5">Trading Card Completion</h3>
          <p className="text-slate-400 text-sm">
            {missing.length === 0
              ? canBeVerified(profile.profile_type)
                ? "All done — submit for verification to get the Verified badge."
                : "All done — your Trade Card is fully built out."
              : `${missing.length} item${missing.length !== 1 ? "s" : ""} left to strengthen your profile.`}
          </p>
        </div>
      </div>

      {/* Missing items */}
      {missing.length > 0 && (
        <div className="space-y-2">
          {missing.map(item => (
            <div key={item.label} className="flex items-start gap-3 bg-slate-700/50 rounded-xl px-3 py-2.5">
              <div className="w-4 h-4 rounded-full border-2 border-slate-500 flex-shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">{item.label}</p>
                <p className="text-xs text-slate-400">{item.hint}</p>
              </div>
              <span className="text-[10px] font-bold text-orange-400 flex-shrink-0">+{item.points}%</span>
            </div>
          ))}

          <a
            href="/build"
            className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-sm transition-colors"
          >
            Complete My Trading Card
          </a>
        </div>
      )}

      {/* Done items (collapsed, just count) */}
      <p className="text-[11px] text-slate-500 mt-3">
        {checklist.filter(c => c.done).length} of {checklist.length} sections complete
      </p>
    </div>
  );
}
