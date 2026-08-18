"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      if (isLogin) {
        const { data: signInData, error } =
          await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        if (signInData?.session) {
          fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/tenant/onboarding/login-notification`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${signInData.session.access_token}`,
              },
            },
          ).catch(console.error);
        }

        router.push("/dashboard/servers");
      } else {
        if (!agreeToTerms) {
          setError(
            "You must agree to the Terms of Service and Privacy Policy to create an account.",
          );
          setLoading(false);
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, company_name: companyName },
          },
        });
        if (error) throw error;

        if (data?.session) {
          fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/tenant/onboarding/welcome`,
            {
              method: "POST",
              headers: { Authorization: `Bearer ${data.session.access_token}` },
            },
          ).catch(console.error);
          router.push("/dashboard/servers");
        } else {
          setSuccess(
            "Account created! Please check your email to confirm, then sign in.",
          );
          setIsLogin(true);
          setEmail("");
          setPassword("");
          setFullName("");
          setCompanyName("");
        }
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard/servers` },
    });
    if (error) setError(error.message);
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setError(null);
    setSuccess(null);
  };

  return (
    <div
      className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-violet-500/30"
      style={{ fontFamily: "Inter, system-ui, sans-serif" }}
    >
      {/* Background glow effects */}
      <div className="fixed top-0 left-1/4 w-[600px] h-[600px] bg-violet-600/8 blur-[160px] rounded-full pointer-events-none" />
      <div className="fixed bottom-10 right-1/4 w-[500px] h-[500px] bg-indigo-600/8 blur-[150px] rounded-full pointer-events-none" />

      {/* Header — matches landing page exactly */}
      <header className="px-6 lg:px-14 h-20 flex items-center justify-between border-b border-white/5 backdrop-blur-md bg-slate-950/70 sticky top-0 z-50">
        {/* Logo → home */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center font-extrabold text-white shadow-lg shadow-violet-500/20 group-hover:scale-105 transition-transform">
            R
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tight bg-gradient-to-r from-white via-slate-200 to-violet-400 bg-clip-text text-transparent">
              Ralles
            </span>
            <span className="text-[9px] text-violet-400 font-bold uppercase tracking-widest -mt-1">
              Reasons for Alles
            </span>
          </div>
        </Link>

        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back
        </button>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Badge */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/5 px-4 py-1.5 text-xs font-bold text-violet-300 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-ping" />
              <span>
                {isLogin ? "Welcome back to Ralles" : "Join Ralles today"}
              </span>
            </div>
          </div>

          {/* Card */}
          <div
            className="relative rounded-2xl overflow-hidden"
            style={{
              background:
                "linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(30,27,75,0.5) 100%)",
              border: "1px solid rgba(139,92,246,0.2)",
              boxShadow:
                "0 0 60px rgba(99,102,241,0.12), 0 4px 40px rgba(0,0,0,0.4)",
            }}
          >
            {/* Top gradient line */}
            <div
              style={{
                height: 3,
                background: "linear-gradient(90deg,#7c3aed,#6366f1,#0ea5e9)",
              }}
            />

            <div className="p-8">
              {/* Heading */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={isLogin ? "login-head" : "signup-head"}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.2 }}
                  className="mb-8 text-center"
                >
                  <h1 className="text-2xl font-extrabold text-white tracking-tight">
                    {isLogin
                      ? "Sign in to your account"
                      : "Create your account"}
                  </h1>
                  <p className="mt-1.5 text-sm text-slate-400">
                    {isLogin
                      ? "Enter your credentials to access your Ralles dashboard."
                      : "Start your free 30-day trial. No credit card required."}
                  </p>
                </motion.div>
              </AnimatePresence>

              {/* Success / Error banners */}
              {success && (
                <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-sm">
                  ✅ {success}
                </div>
              )}
              {error && (
                <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm">
                  ❌ {error}
                </div>
              )}

              {/* Google Button */}
              <button
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 h-11 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm font-semibold text-slate-200 transition-all mb-5"
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                {isLogin ? "Continue with Google" : "Sign up with Google"}
              </button>

              {/* Divider */}
              <div className="relative mb-5">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/8" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span
                    className="px-3 text-slate-500"
                    style={{ background: "transparent" }}
                  >
                    or continue with email
                  </span>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleEmailAuth} className="space-y-4">
                <AnimatePresence>
                  {!isLogin && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4 overflow-hidden"
                    >
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="fullName"
                          className="text-slate-300 text-xs font-semibold"
                        >
                          Full Name
                        </Label>
                        <Input
                          id="fullName"
                          placeholder="John Doe"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          required={!isLogin}
                          className="bg-slate-900/80 border-white/10 text-white placeholder:text-slate-500 focus:border-violet-500/50 focus:ring-violet-500/20 h-11"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="companyName"
                          className="text-slate-300 text-xs font-semibold"
                        >
                          Company
                        </Label>
                        <Input
                          id="companyName"
                          placeholder="Acme Inc."
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          required={!isLogin}
                          className="bg-slate-900/80 border-white/10 text-white placeholder:text-slate-500 focus:border-violet-500/50 focus:ring-violet-500/20 h-11"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="email"
                    className="text-slate-300 text-xs font-semibold"
                  >
                    Email address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-slate-900/80 border-white/10 text-white placeholder:text-slate-500 focus:border-violet-500/50 focus:ring-violet-500/20 h-11"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="password"
                      className="text-slate-300 text-xs font-semibold"
                    >
                      Password
                    </Label>
                    {isLogin && (
                      <span className="text-xs text-violet-400 hover:text-violet-300 cursor-pointer transition-colors">
                        Forgot password?
                      </span>
                    )}
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder={isLogin ? "••••••••" : "Min. 8 characters"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-slate-900/80 border-white/10 text-white placeholder:text-slate-500 focus:border-violet-500/50 focus:ring-violet-500/20 h-11"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed hover:-translate-y-0.5"
                  style={{
                    background: loading
                      ? "rgba(124,58,237,0.5)"
                      : "linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)",
                    boxShadow: "0 4px 24px rgba(124,58,237,0.3)",
                  }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing...
                    </span>
                  ) : isLogin ? (
                    "Sign In"
                  ) : (
                    "Create Account"
                  )}
                </button>
                {/* Terms checkbox - shown only on signup */}
                {!isLogin && (
                  <div className="flex items-start gap-2 mt-3 text-xs text-slate-400">
                    <input
                      id="agree"
                      type="checkbox"
                      checked={agreeToTerms}
                      onChange={(e) => setAgreeToTerms(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-white/10 bg-slate-900/80 text-violet-500 focus:ring-violet-400"
                    />
                    <label htmlFor="agree" className="leading-tight">
                      I agree to the{" "}
                      <Link
                        href="/terms"
                        className="text-violet-400 hover:text-violet-300 font-semibold"
                      >
                        Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link
                        href="/privacy"
                        className="text-violet-400 hover:text-violet-300 font-semibold"
                      >
                        Privacy Policy
                      </Link>
                      .
                    </label>
                  </div>
                )}
              </form>

              {/* Switch mode */}
              <p className="mt-6 text-center text-sm text-slate-400">
                {isLogin
                  ? "Don't have an account? "
                  : "Already have an account? "}
                <button
                  type="button"
                  onClick={switchMode}
                  className="text-violet-400 hover:text-violet-300 font-semibold transition-colors"
                >
                  {isLogin ? "Sign up free" : "Sign in"}
                </button>
              </p>
            </div>
          </div>

          {/* Trust signals */}
          <div className="mt-6 flex items-center justify-center gap-6 text-xs text-slate-600">
            <span className="flex items-center gap-1.5">
              🔒 End-to-end encrypted
            </span>
            <span className="flex items-center gap-1.5">
              🛡️ SOC 2 compliant
            </span>
            <span className="flex items-center gap-1.5">
              ⚡ Free & Open Source
            </span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 px-6 text-center text-xs text-slate-600">
        © 2026 Ralles. All rights reserved. ·{" "}
        <Link
          href="/privacy"
          className="hover:text-slate-400 transition-colors"
        >
          Privacy Policy
        </Link>
      </footer>
    </div>
  );
}
