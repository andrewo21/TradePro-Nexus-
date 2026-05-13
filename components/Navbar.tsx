"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, HardHat, Search, Rss } from "lucide-react";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0f172a]/95 backdrop-blur-sm border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-orange-600 rounded flex items-center justify-center">
            <HardHat className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">
            <span className="text-white">TradePro</span>
            <span className="text-orange-500"> Nexus</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link href="/feed" className="flex items-center gap-1.5 text-slate-400 hover:text-orange-400 transition-colors">
            <Rss className="w-4 h-4" /> Live Feed
          </Link>
          <Link href="/search" className="flex items-center gap-1.5 text-slate-400 hover:text-orange-400 transition-colors">
            <Search className="w-4 h-4" /> Find Crews
          </Link>
          <Link href="/build" className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-md transition-colors font-semibold">
            Build Trade Card
          </Link>
          <Link href="/login" className="px-4 py-2 border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white rounded-md transition-colors">
            Sign In
          </Link>
        </div>

        {/* Mobile Toggle */}
        <button onClick={() => setOpen(!open)} className="md:hidden text-slate-400 hover:text-white transition-colors">
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="md:hidden border-t border-slate-800 bg-[#0f172a] px-4 py-4 space-y-3">
          <Link href="/feed" onClick={() => setOpen(false)} className="flex items-center gap-2 text-slate-300 hover:text-orange-400 py-2 transition-colors">
            <Rss className="w-4 h-4" /> Live Feed
          </Link>
          <Link href="/search" onClick={() => setOpen(false)} className="flex items-center gap-2 text-slate-300 hover:text-orange-400 py-2 transition-colors">
            <Search className="w-4 h-4" /> Find Crews
          </Link>
          <Link href="/build" onClick={() => setOpen(false)} className="block w-full text-center py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-md font-semibold transition-colors">
            Build Trade Card
          </Link>
          <Link href="/login" onClick={() => setOpen(false)} className="block w-full text-center py-3 border border-slate-600 text-slate-300 rounded-md transition-colors">
            Sign In
          </Link>
        </div>
      )}
    </nav>
  );
}
