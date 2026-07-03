import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Resources for Contractors and General Contractors",
  description:
    "Guides on finding and verifying licensed contractors, hiring subcontractors, and understanding prevailing wage requirements on construction projects.",
};

const ARTICLES = [
  {
    href: "/resources/how-to-find-a-licensed-contractor-in-florida",
    title: "How to Find a Licensed Contractor in Florida",
    description: "How to verify a Florida contractor's license through the DBPR before you hire.",
  },
  {
    href: "/resources/how-to-find-a-licensed-contractor-in-north-carolina",
    title: "How to Find a Licensed Contractor in North Carolina",
    description: "How to verify a license through the NCLBGC and understand license limitation tiers.",
  },
  {
    href: "/resources/how-to-find-a-licensed-contractor-in-virginia",
    title: "How to Find a Licensed Contractor in Virginia",
    description: "How Virginia's DPOR Class A, B, and C licenses work, and how to verify one.",
  },
  {
    href: "/resources/how-to-verify-a-contractor-license",
    title: "How to Verify a Contractor's License",
    description: "A five step process that works for any state's contractor license lookup.",
  },
  {
    href: "/resources/what-is-a-davis-bacon-wage-determination",
    title: "What Is a Davis-Bacon Wage Determination?",
    description: "How federal wage determinations work on Davis-Bacon covered construction contracts.",
  },
  {
    href: "/resources/what-is-a-prevailing-wage-project",
    title: "What Is a Prevailing Wage Project?",
    description: "What triggers prevailing wage requirements and what contractors need to stay compliant.",
  },
  {
    href: "/resources/how-to-hire-a-subcontractor",
    title: "How to Hire a Subcontractor the Right Way",
    description: "A practical checklist for general contractors, from scope to payment terms.",
  },
  {
    href: "/resources/general-contractor-vs-subcontractor",
    title: "General Contractor vs. Subcontractor",
    description: "The legal and contractual differences between the two roles, explained clearly.",
  },
];

export default function ResourcesPage() {
  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-20">
        <p className="text-xs font-bold uppercase tracking-widest text-orange-400 mb-2">Resources</p>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
          Guides for Contractors and General Contractors
        </h1>
        <p className="text-slate-400 leading-relaxed mb-10">
          Practical guides on finding licensed contractors, verifying credentials, and understanding the rules that
          govern construction hiring.
        </p>

        <div className="space-y-3">
          {ARTICLES.map((article) => (
            <Link
              key={article.href}
              href={article.href}
              className="card-hover flex items-center justify-between gap-4 bg-slate-800/50 border border-slate-700/50 hover:border-orange-500/50 rounded-xl p-5 transition-colors group"
            >
              <div>
                <h2 className="font-black text-white group-hover:text-orange-400 transition-colors mb-1">
                  {article.title}
                </h2>
                <p className="text-slate-400 text-sm">{article.description}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-orange-400 flex-shrink-0 transition-colors" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
