import Link from "next/link";
import Navbar from "@/components/Navbar";
import { ArrowRight } from "lucide-react";

export function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-black text-white mt-8 mb-2">{children}</h2>;
}

export function P({ children }: { children: React.ReactNode }) {
  return <p className="text-slate-300 text-sm leading-relaxed mb-4">{children}</p>;
}

export function Ul({ items }: { items: string[] }) {
  return (
    <ul className="list-disc pl-5 space-y-1.5 text-slate-300 text-sm leading-relaxed mb-4">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

export default function ResourceArticle({
  eyebrow,
  title,
  intro,
  ctaHeading,
  ctaBody,
  ctaHref,
  ctaLabel,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  ctaHeading: string;
  ctaBody: string;
  ctaHref: string;
  ctaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <Navbar />
      <article className="max-w-2xl mx-auto px-4 pt-24 pb-20">
        <p className="text-xs font-bold uppercase tracking-widest text-orange-400 mb-2">{eyebrow}</p>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-4 leading-tight">{title}</h1>
        <p className="text-slate-400 text-base leading-relaxed mb-8">{intro}</p>

        {children}

        <div className="mt-12 bg-gradient-to-br from-orange-950/30 to-slate-900 border border-orange-900/40 rounded-2xl p-6">
          <h2 className="text-lg font-black text-white mb-2">{ctaHeading}</h2>
          <p className="text-slate-300 text-sm mb-4">{ctaBody}</p>
          <Link
            href={ctaHref}
            className="inline-flex items-center gap-2 px-5 py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-sm transition-colors"
          >
            {ctaLabel} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <p className="mt-10 pt-6 border-t border-slate-800 text-xs text-slate-500">
          <Link href="/resources" className="hover:text-orange-400 transition-colors">
            Back to Resources
          </Link>
        </p>
      </article>
    </div>
  );
}
