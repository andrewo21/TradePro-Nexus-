"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { HardHat, Building2, ArrowRight, Mail, Lock, User, CheckCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import { getSupabase } from "@/lib/supabase";

type AccountType = "tradepro" | "gc" | null;

export default function SignupPage() {
  const router = useRouter();
  const [accountType, setAccountType] = useState<AccountType>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accountType) return;
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabase();
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name, role: accountType },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${accountType === "tradepro" ? "/build" : "/search"}`,
        },
      });
      if (authError) throw authError;
      if (data.session) {
        router.push(accountType === "tradepro" ? "/build" : "/search");
        router.refresh();
      } else {
        setCheckEmail(true);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (checkEmail) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-slate-100">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full text-center"
          >
            <div className="w-16 h-16 bg-orange-600/20 border border-orange-600/40 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-orange-400" />
            </div>
            <h2 className="text-2xl font-black text-white mb-2">Check Your Email</h2>
            <p className="text-slate-400 mb-2">
              We sent a confirmation link to <span className="text-white font-semibold">{email}</span>.
            </p>
            <p className="text-slate-500 text-sm">
              Click the link to activate your account. Check your spam folder if you don&apos;t see it.
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <Navbar />
      <div className="flex items-center justify-center min-h-screen px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <h1 className="text-2xl font-black text-white">Join TradePro Nexus</h1>
            <p className="text-slate-400 text-sm mt-1">Free to join. No subscription ever.</p>
          </div>

          {/* Account type selection */}
          {!accountType ? (
            <div className="space-y-3">
              <p className="text-center text-sm text-slate-400 mb-4">I am a…</p>
              <button
                onClick={() => setAccountType("tradepro")}
                className="w-full bg-gradient-to-br from-orange-950/40 to-slate-900 border border-orange-800/50 hover:border-orange-600 rounded-2xl p-5 text-left transition-all group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <HardHat className="w-6 h-6 text-orange-400" />
                  <span className="font-black text-white text-base">Trade Pro / Subcontractor</span>
                </div>
                <p className="text-slate-400 text-sm mb-2">Build your Digital Trade Card. Get seen by GCs running $30M+ projects.</p>
                <span className="flex items-center gap-1 text-orange-400 text-sm font-semibold group-hover:gap-2 transition-all">
                  Create Trade Card Free <ArrowRight className="w-4 h-4" />
                </span>
              </button>

              <button
                onClick={() => setAccountType("gc")}
                className="w-full bg-gradient-to-br from-blue-950/40 to-slate-900 border border-blue-800/50 hover:border-blue-600 rounded-2xl p-5 text-left transition-all group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <Building2 className="w-6 h-6 text-blue-400" />
                  <span className="font-black text-white text-base">General Contractor / Developer</span>
                </div>
                <p className="text-slate-400 text-sm mb-2">Access the verified marketplace. Find vetted crews with verified payroll in seconds.</p>
                <span className="flex items-center gap-1 text-blue-400 text-sm font-semibold group-hover:gap-2 transition-all">
                  Join the Marketplace <ArrowRight className="w-4 h-4" />
                </span>
              </button>
            </div>
          ) : (
            <div>
              <button
                onClick={() => setAccountType(null)}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-300 mb-5 transition-colors"
              >
                ← Change account type
              </button>

              <div className={`mb-4 p-3 rounded-xl border text-sm ${
                accountType === "tradepro"
                  ? "bg-orange-950/30 border-orange-800/50 text-orange-300"
                  : "bg-blue-950/30 border-blue-800/50 text-blue-300"
              }`}>
                {accountType === "tradepro"
                  ? "Creating a Trade Pro account — your Digital Trade Card will be created after signup."
                  : "Creating a GC account — you'll have full access to the verified crew marketplace."}
              </div>

              <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                      {accountType === "tradepro" ? "Full Name" : "Company Name"}
                    </label>
                    <div className="relative">
                      {accountType === "tradepro"
                        ? <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        : <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      }
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={accountType === "tradepro" ? "Marcus Thompson" : "Midwest Electrical Solutions"}
                        className="w-full bg-slate-900 border border-slate-600 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        className="w-full bg-slate-900 border border-slate-600 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min. 8 characters"
                        minLength={8}
                        className="w-full bg-slate-900 border border-slate-600 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-950/40 border border-red-800/50 text-red-400 text-sm rounded-xl px-4 py-3">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full flex items-center justify-center gap-2 py-3 font-bold rounded-xl text-sm transition-colors disabled:opacity-50 ${
                      accountType === "tradepro"
                        ? "bg-orange-600 hover:bg-orange-500 text-white"
                        : "bg-blue-700 hover:bg-blue-600 text-white"
                    }`}
                  >
                    {loading ? "Creating account…" : <><span>Create Free Account</span> <ArrowRight className="w-4 h-4" /></>}
                  </button>

                  <p className="text-center text-[11px] text-slate-600">
                    By signing up you agree to our Terms of Service. Free forever, no subscription.
                  </p>
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
            {" "}· A TradePro Enterprises product
          </p>
        </motion.div>
      </div>
    </div>
  );
}
