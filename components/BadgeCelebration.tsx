"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { Badge } from "@/lib/badge-definitions";

interface Props {
  badges: Badge[];
  onClose: () => void;
}

export default function BadgeCelebration({ badges, onClose }: Props) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => { setVisible(false); setTimeout(onClose, 300); }, 6000);
    return () => clearTimeout(t);
  }, [onClose]);

  if (!badges.length) return null;

  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
      <div className="bg-slate-800 border border-orange-700/60 rounded-2xl shadow-2xl px-4 py-4 max-w-xs w-screen flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-white font-black text-sm">
            {badges.length === 1 ? "Badge Earned!" : `${badges.length} Badges Earned!`} 🎉
          </p>
          <button onClick={() => { setVisible(false); setTimeout(onClose, 300); }} className="text-slate-500 hover:text-slate-300 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
        {badges.map(badge => (
          <div key={badge.slug} className={`flex items-center gap-2.5 p-2.5 rounded-xl border ${badge.bg} ${badge.border}`}>
            <span className="text-2xl">{badge.icon}</span>
            <div>
              <p className={`font-bold text-sm ${badge.color}`}>{badge.label}</p>
              <p className="text-slate-400 text-xs leading-tight">{badge.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
