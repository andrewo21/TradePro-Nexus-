"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { HardHat, Building2, ArrowRight, Mail, Lock, User, CheckCircle, ShieldCheck, Ruler, Wrench, MapPin, Sparkles, X } from "lucide-react";
import Navbar from "@/components/Navbar";
import { getSupabase } from "@/lib/supabase";
import { PROFILE_TYPES, type ProfileType } from "@/lib/constants";
import { trackEvent } from "@/lib/analytics";

type UnclaimedMatch = {
  id: string;
  business_name: string;
  license_type: string | null;
  city: string | null;
  source_state: string | null;
  claim_token: string;
};

// Account type: 6 profile types + GC
type AccountType = ProfileType | "gc" | null;

// Visual config for each type on the selection screen
const TYPE_OPTIONS: Array<{
  key: AccountType;
  label: string;
  sublabel: string;
  icon: React.ElementType;
  color: "orange" | "blue" | "green" | "purple";
  desc: string;
}> = [
  { key: "tradepro", label: "Trade Pro / Worker", sublabel: "Individual tradeworker", icon: HardHat, color: "orange", desc: "Build your Digital Trade Card. Get seen by GCs running $30M+ projects." },
  { key: "sub", label: "Sub / Contractor", sublabel: "Subcontracting company or contractor", icon: Wrench, color: "orange", desc: "Showcase your company, get verified, and appear in GC crew searches." },
  { key: "inspector", label: "Inspector / Testing Agency", sublabel: "Special inspector, testing lab, or firm", icon: ShieldCheck, color: "green", desc: "Post your license and certifications. GCs search for inspectors by jurisdiction and type." },
  { key: "architect", label: "Architect", sublabel: "Design, interior, landscape, or code consultant", icon: Ruler, color: "blue", desc: "Showcase your work, license, and specializations to owners and GCs." },
  { key: "engineer", label: "Engineer", sublabel: "Structural, civil, MEP, or other discipline", icon: Wrench, color: "purple", desc: "List your PE license, discipline, and software to connect with GCs and owners." },
  { key: "gc", label: "GC / Developer", sublabel: "General contractor or developer", icon: Building2, color: "blue", desc: "Find vetted crews, inspectors, architects, and engineers. Full verified marketplace access." },
];

const COLOR_MAP = {
  orange: {
    card: "border-orange-800/50 hover:border-orange-600 from-orange-950/40",
    badge: "text-orange-400 bg-orange-900/30 border-orange-800/40",
    btn: "bg-orange-600 hover:bg-orange-500",
    text: "text-orange-400",
  },
  blue: {
    card: "border-blue-800/50 hover:border-blue-600 from-blue-950/40",
    badge: "text-blue-400 bg-blue-900/30 border-blue-800/40",
    btn: "bg-blue-700 hover:bg-blue-600",
    text: "text-blue-400",
  },
  green: {
    card: "border-green-800/50 hover:border-green-600 from-green-950/40",
    badge: "text-green-400 bg-green-900/30 border-green-800/40",
    btn: "bg-green-700 hover:bg-green-600",
    text: "text-green-400",
  },
  purple: {
    card: "border-purple-800/50 hover:border-purple-600 from-purple-950/40",
    badge: "text-purple-400 bg-purple-900/30 border-purple-800/40",
    btn: "bg-purple-700 hover:bg-purple-600",
    text: "text-purple-400",
  },
};

function SignupPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam  = searchParams.get("next");
  const refParam   = searchParams.get("ref") ?? "";
  const [accountType, setAccountType] = useState<AccountType>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Magic match — searches unclaimed_profiles as the user types their name
  const [matches, setMatches] = useState<UnclaimedMatch[]>([]);
  const [matchLoading, setMatchLoading] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<UnclaimedMatch | null>(null);
  const [matchDismissed, setMatchDismissed] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Only search for non-GC accounts, only when name is long enough
    if (accountType === "gc" || name.length < 3 || matchDismissed) {
      setMatches([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setMatchLoading(true);
      try {
        const res = await fetch(`/api/unclaimed/match?name=${encodeURIComponent(name)}`);
        if (res.ok) {
          const data = await res.json();
          setMatches(data.matches ?? []);
        }
      } catch { /* ignore network errors */ }
      finally { setMatchLoading(false); }
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [name, accountType, matchDismissed]);

  const selectedOption = TYPE_OPTIONS.find(o => o.key === accountType);
  const colors = selectedOption ? COLOR_MAP[selectedOption.color] : COLOR_MAP.orange;
  const isGC = accountType === "gc";

  // Build the post-signup destination, injecting the claim token if the user confirmed a match
  function buildRedirect() {
    if (isGC) return nextParam || "/search";
    if (selectedMatch) {
      const claimPath = `/build?claim=${selectedMatch.claim_token}&business=${encodeURIComponent(selectedMatch.business_name)}`;
      return nextParam || claimPath;
    }
    return nextParam || "/build";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accountType) return;
    if (!agreedToTerms) {
      setError("You must agree to the Terms of Use and Membership Agreement to create an account.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabase();
      const redirect = buildRedirect();
      const { data, error: authError } = await supabase!.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            role: isGC ? "gc" : "tradepro",
            profile_type: accountType,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirect)}`,
        },
      });
      if (authError) throw authError;
      trackEvent("signup", { account_type: accountType, claimed_match: !!selectedMatch });
      // Credit the referrer if this signup came through a referral link
      if (data.session && refParam) {
        fetch("/api/referral/credit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ referrer_id: refParam }),
        }).catch(() => {});
      }

      if (data.session) {
        router.push(redirect);
        router.refresh();
      } else {
        setCheckEmail(true);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (checkEmail) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-slate-100">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen px-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full text-center">
            <div className="w-16 h-16 bg-orange-600/20 border border-orange-600/40 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-orange-400" />
            </div>
            <h2 className="text-2xl font-black text-white mb-2">Check Your Email</h2>
            <p className="text-slate-400 mb-2">Confirmation link sent to <span className="text-white font-semibold">{email}</span>.</p>
            <p className="text-slate-500 text-sm">Check your spam folder if you don&apos;t see it.</p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <Navbar />
      <div className="flex items-center justify-center min-h-screen px-4 py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full max-w-2xl">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-black text-white">Join TradePro Nexus</h1>
            <p className="text-slate-400 text-sm mt-1">Free to join. No subscription ever.</p>
          </div>

          {/* Type selection */}
          {!accountType ? (
            <div className="grid sm:grid-cols-2 gap-3">
              {TYPE_OPTIONS.map(opt => {
                const Icon = opt.icon;
                const c = COLOR_MAP[opt.color];
                return (
                  <button key={String(opt.key)} onClick={() => setAccountType(opt.key)}
                    className={`bg-gradient-to-br ${c.card} to-slate-900 border rounded-2xl p-5 text-left transition-all group`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={`w-5 h-5 ${c.text}`} />
                      <span className={`text-xs font-bold uppercase tracking-widest ${c.text}`}>{opt.sublabel}</span>
                    </div>
                    <p className="text-white font-black text-sm mb-1">{opt.label}</p>
                    <p className={`text-xs mb-2 ${c.text.replace("400", "300").replace("text-", "text-slate-")}`} style={{ color: "#94a3b8" }}>{opt.desc}</p>
                    <span className={`flex items-center gap-1 text-xs font-semibold ${c.text} group-hover:gap-2 transition-all`}>
                      Get Started <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div>
              <button onClick={() => setAccountType(null)} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-300 mb-5 transition-colors">
                ← Change account type
              </button>

              {/* Selected type banner */}
              <div className={`mb-4 p-3 rounded-xl border text-sm ${
                isGC ? "bg-blue-950/30 border-blue-800/50 text-blue-300" :
                accountType === "inspector" ? "bg-green-950/30 border-green-800/50 text-green-300" :
                accountType === "architect" || accountType === "engineer" ? "bg-purple-950/30 border-purple-800/50 text-purple-300" :
                "bg-orange-950/30 border-orange-800/50 text-orange-300"
              }`}>
                Creating a <strong>{selectedOption?.label}</strong> account — {
                  isGC ? "access the verified crew marketplace." :
                  accountType === "inspector" ? "your Digital Trade Card will show your license, certs, and inspection types." :
                  accountType === "architect" ? "your profile will show your license, firm, and specializations." :
                  accountType === "engineer" ? "your profile will show your PE license, discipline, and software." :
                  "your Digital Trade Card will be created after signup."
                }
              </div>

              <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                      {isGC ? "Company Name" : "Full Name"}
                    </label>
                    <div className="relative">
                      {isGC ? <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" /> : <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />}
                      <input type="text" required value={name} onChange={e => { setName(e.target.value); setSelectedMatch(null); setMatchDismissed(false); }}
                        placeholder={isGC ? "Midwest Electrical Solutions" : accountType === "inspector" ? "James Sullivan" : "Your full name"}
                        className={`w-full bg-slate-900 border rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none transition-colors ${selectedMatch ? "border-orange-500" : "border-slate-600 focus:border-orange-500"}`} />
                    </div>

                    {/* Magic match — shows when we find a match in the unclaimed directory */}
                    {!isGC && !matchDismissed && !selectedMatch && matchLoading && name.length >= 3 && (
                      <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
                        <span className="w-3 h-3 border border-slate-500 border-t-transparent rounded-full animate-spin inline-block" />
                        Checking the contractor directory…
                      </p>
                    )}

                    {!isGC && !matchDismissed && !selectedMatch && !matchLoading && matches.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {matches.map(m => (
                          <div key={m.id} className="bg-orange-950/40 border border-orange-700/60 rounded-xl px-3 py-3">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                                <p className="text-orange-300 text-[11px] font-bold uppercase tracking-wide">We found your business listing</p>
                              </div>
                              <button type="button" onClick={() => setMatchDismissed(true)} className="text-slate-600 hover:text-slate-400 flex-shrink-0">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <p className="text-white font-black text-sm mb-0.5">{m.business_name}</p>
                            <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
                              {m.license_type && <span>{m.license_type}</span>}
                              {(m.city || m.source_state) && (
                                <span className="flex items-center gap-0.5">
                                  <MapPin className="w-3 h-3" />
                                  {[m.city, m.source_state].filter(Boolean).join(", ")}
                                </span>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <button type="button"
                                onClick={() => setSelectedMatch(m)}
                                className="flex-1 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-lg transition-colors">
                                Yes, that's me — claim it free
                              </button>
                              <button type="button"
                                onClick={() => setMatchDismissed(true)}
                                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-400 text-xs font-semibold rounded-lg transition-colors">
                                Not me
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Confirmed match banner */}
                    {selectedMatch && (
                      <div className="mt-2 bg-green-950/40 border border-green-700/50 rounded-xl px-3 py-2.5 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-green-300 text-xs font-bold">Listing linked</p>
                            <p className="text-slate-400 text-[11px] truncate">{selectedMatch.business_name}</p>
                          </div>
                        </div>
                        <button type="button" onClick={() => { setSelectedMatch(null); setMatchDismissed(false); }}
                          className="text-slate-600 hover:text-slate-400 flex-shrink-0">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com"
                        className="w-full bg-slate-900 border border-slate-600 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" minLength={8}
                        className="w-full bg-slate-900 border border-slate-600 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500" />
                    </div>
                  </div>
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={agreedToTerms} onChange={e => setAgreedToTerms(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-slate-600 bg-slate-900 text-orange-600 focus:ring-orange-500 focus:ring-offset-0 cursor-pointer" />
                    <span className="text-xs text-slate-400">
                      I agree to the{" "}
                      <Link href="/terms-of-use" target="_blank" className="text-orange-400 hover:text-orange-300 underline">Terms of Use</Link>
                      {" "}and{" "}
                      <Link href="/membership-agreement" target="_blank" className="text-orange-400 hover:text-orange-300 underline">Membership Agreement</Link>
                    </span>
                  </label>
                  {error && <div className="bg-red-950/40 border border-red-800/50 text-red-400 text-sm rounded-xl px-4 py-3">{error}</div>}
                  <button type="submit" disabled={loading || !agreedToTerms}
                    className={`w-full flex items-center justify-center gap-2 py-3 font-bold rounded-xl text-sm transition-colors disabled:opacity-50 text-white ${colors.btn}`}>
                    {loading ? "Creating account…" : <><span>Create Free Account</span><ArrowRight className="w-4 h-4" /></>}
                  </button>
                  <p className="text-center text-[11px] text-slate-600">Free forever. No subscription.</p>
                </form>
                <p className="text-center text-xs text-slate-500 mt-4">
                  Already have an account?{" "}
                  <Link href="/login" className="text-orange-400 hover:text-orange-300 font-semibold">Sign in</Link>
                </p>
              </div>
            </div>
          )}

          <p className="text-center text-xs text-slate-600 mt-6">
            <Link href="/" className="hover:text-slate-500 transition-colors">TradePro Nexus</Link>
            {" "}· A TradePro Technologies LLC product
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SignupPageInner />
    </Suspense>
  );
}
