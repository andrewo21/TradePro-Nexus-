"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

interface Props {
  initialOpenToUnionJobsOnly: boolean;
  initialSeekingPrevailingWageWork: boolean;
}

export default function JobPreferences({ initialOpenToUnionJobsOnly, initialSeekingPrevailingWageWork }: Props) {
  const [openToUnionJobsOnly, setOpenToUnionJobsOnly] = useState(initialOpenToUnionJobsOnly);
  const [seekingPrevailingWageWork, setSeekingPrevailingWageWork] = useState(initialSeekingPrevailingWageWork);
  const [savingField, setSavingField] = useState<string | null>(null);

  async function update(field: "open_to_union_jobs_only" | "seeking_prevailing_wage_work", value: boolean) {
    setSavingField(field);
    try {
      await fetch("/api/job-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
    } catch {}
    setSavingField(null);
  }

  return (
    <div className="space-y-2.5">
      <label className="flex items-center justify-between gap-3 cursor-pointer">
        <span className="text-sm text-slate-300">Open to Union Jobs Only</span>
        <span className="flex items-center gap-2">
          {savingField === "open_to_union_jobs_only" && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
          <input
            type="checkbox"
            checked={openToUnionJobsOnly}
            onChange={e => { setOpenToUnionJobsOnly(e.target.checked); update("open_to_union_jobs_only", e.target.checked); }}
            className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-orange-600 focus:ring-orange-500 focus:ring-offset-0"
          />
        </span>
      </label>
      <label className="flex items-center justify-between gap-3 cursor-pointer">
        <span className="text-sm text-slate-300">Seeking Prevailing Wage Work</span>
        <span className="flex items-center gap-2">
          {savingField === "seeking_prevailing_wage_work" && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
          <input
            type="checkbox"
            checked={seekingPrevailingWageWork}
            onChange={e => { setSeekingPrevailingWageWork(e.target.checked); update("seeking_prevailing_wage_work", e.target.checked); }}
            className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-orange-600 focus:ring-orange-500 focus:ring-offset-0"
          />
        </span>
      </label>
    </div>
  );
}
