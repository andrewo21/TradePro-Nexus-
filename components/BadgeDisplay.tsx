"use client";

import { BADGES, type Badge } from "@/lib/badge-definitions";

interface Props {
  badgeSlugs: string[];
  size?: "sm" | "md";
}

export default function BadgeDisplay({ badgeSlugs, size = "md" }: Props) {
  if (!badgeSlugs.length) return null;

  const earned = badgeSlugs
    .map(slug => BADGES.find(b => b.slug === slug))
    .filter((b): b is Badge => Boolean(b));

  if (!earned.length) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {earned.map(badge => (
        <span
          key={badge.slug}
          title={badge.description}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-bold ${badge.color} ${badge.bg} ${badge.border} ${size === "sm" ? "text-[10px] px-1.5" : ""}`}
        >
          <span>{badge.icon}</span>
          {size === "md" && <span>{badge.label}</span>}
        </span>
      ))}
    </div>
  );
}
