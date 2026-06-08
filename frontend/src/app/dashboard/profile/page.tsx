'use client'

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/utils/supabase/client";
import { motion } from "framer-motion";

const cardStyle = {
  background: 'rgba(15,23,42,0.8)',
  border: '1px solid rgba(255,255,255,0.07)',
  backdropFilter: 'blur(12px)',
  borderRadius: '1rem',
};

const inputCls = "bg-slate-900/80 border-white/10 text-white placeholder:text-slate-500 focus:border-violet-500/50 h-11";

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [isPremium, setIsPremium] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const supabase = createClient();

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      let premiumActive = false;

      const { data: profileData, error: profileErr } = await supabase
        .from("profiles").select("*").single();

      if (!profileErr && profileData) {
        setProfile(profileData);
        setFullName(profileData.full_name || "");
        setCompanyName(profileData.company_name || "");
        if ('is_premium' in profileData) premiumActive = !!profileData.is_premium;
      }

      const { data: configData } = await supabase
        .from("tenant_configurations").select("is_premium");

      if (configData?.some((c: any) => c.is_premium)) premiumActive = true;
      setIsPremium(premiumActive);
    } catch (e) {
      console.error("Error loading profile:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfileData(); }, []);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("upgrade_success") && searchParams.get("session_id")) {
      const completeUpgrade = async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) return;
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/billing/complete-session?session_id=${searchParams.get("session_id")}`,
            { headers: { "Authorization": `Bearer ${session.access_token}` } }
          );
          if (res.ok) {
            showToast("🎉 Upgrade successful! Welcome to Ralles Premium.");
            window.history.replaceState({}, document.title, window.location.pathname);
            fetchProfileData();
          }
        } catch (err) { console.error(err); }
      };
      completeUpgrade();
    }
  }, [supabase]);

  const handleSaveChanges = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({
        full_name: fullName,
        company_name: companyName,
      }).eq("id", profile.id);
      if (error) throw error;
      showToast("Profile updated successfully!");
      fetchProfileData();
    } catch (e: any) {
      showToast(e.message || "Failed to update profile", 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/billing/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
        body: JSON.stringify({
          success_url: `${window.location.origin}/dashboard/profile?upgrade_success=true`,
          cancel_url: `${window.location.origin}/dashboard/profile`,
        }),
      });
      if (!res.ok) throw new Error("Stripe checkout initialization failed");
      const data = await res.json();
      if (data?.checkout_url) window.location.href = data.checkout_url;
    } catch (e: any) {
      showToast(e.message || "Upgrade initialization failed", 'error');
    } finally {
      setIsUpgrading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-sm">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 lg:px-14 py-12 max-w-5xl mx-auto">
      {/* Toast */}
      {toast && (
        <div
          className="fixed top-24 right-6 z-[100] px-5 py-3.5 rounded-xl text-sm font-semibold shadow-2xl transition-all"
          style={{
            background: toast.type === 'success' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
            border: `1px solid ${toast.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
            color: toast.type === 'success' ? '#34d399' : '#f87171',
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* Page header */}
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/5 px-3 py-1 text-xs font-bold text-violet-300 mb-4">
          <span className="w-1.5 h-1.5 bg-violet-400 rounded-full" />
          Account settings
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-white">Profile & Configuration</h1>
        <p className="text-slate-400 mt-2">Manage your account details and enterprise configuration.</p>
      </div>

      <div className="h-px mb-10" style={{ background: 'linear-gradient(90deg,rgba(99,102,241,0.3),transparent)' }} />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Personal info */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <div style={cardStyle} className="overflow-hidden">
            <div style={{ height: 3, background: 'linear-gradient(90deg,#7c3aed,#6366f1)' }} />
            <div className="p-6">
              <h2 className="text-lg font-bold text-white mb-1">Personal Information</h2>
              <p className="text-slate-400 text-sm mb-6">Update your personal details here.</p>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-slate-300 text-xs font-semibold">Full Name</Label>
                  <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-slate-300 text-xs font-semibold">Email</Label>
                  <Input id="email" type="email" value={profile?.email || ""} disabled
                    className="bg-slate-900/40 border-white/5 text-slate-500 h-11 cursor-not-allowed" />
                </div>
              </div>

              <div className="mt-6 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <button
                  onClick={handleSaveChanges}
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:-translate-y-0.5 disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(135deg,#7c3aed,#6366f1)',
                    boxShadow: '0 4px 20px rgba(124,58,237,0.3)',
                  }}
                >
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </span>
                  ) : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Enterprise config */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <div style={cardStyle} className="overflow-hidden">
            <div style={{ height: 3, background: 'linear-gradient(90deg,#6366f1,#0ea5e9)' }} />
            <div className="p-6">
              <h2 className="text-lg font-bold text-white mb-1">Enterprise Configuration</h2>
              <p className="text-slate-400 text-sm mb-6">Manage your company settings and subscription tier.</p>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="company" className="text-slate-300 text-xs font-semibold">Company Name</Label>
                  <Input id="company" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={inputCls} />
                </div>

                {/* Plan badge */}
                <div
                  className="p-4 rounded-xl space-y-2"
                  style={{
                    background: isPremium ? 'rgba(16,185,129,0.07)' : 'rgba(124,58,237,0.07)',
                    border: isPremium ? '1px solid rgba(16,185,129,0.25)' : '1px solid rgba(124,58,237,0.25)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm" style={{ color: isPremium ? '#34d399' : '#c4b5fd' }}>
                      {isPremium ? '✨ Enterprise Premium' : '🎯 Free Trial'}
                    </h4>
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                      style={{
                        background: isPremium ? 'rgba(16,185,129,0.15)' : 'rgba(124,58,237,0.15)',
                        color: isPremium ? '#34d399' : '#c4b5fd',
                      }}
                    >
                      {isPremium ? 'ACTIVE' : 'TRIAL'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {isPremium
                      ? "Unlimited guardrails, high-fidelity neurosymbolic reasoning, and active compliance policies."
                      : "Free trial active. Connect unlimited servers, 30-day evaluation period."}
                  </p>
                  {!isPremium && (
                    <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-1.5 rounded-full w-[10%]" style={{ background: 'linear-gradient(90deg,#7c3aed,#6366f1)' }} />
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                {!isPremium ? (
                  <button
                    onClick={handleUpgrade}
                    disabled={isUpgrading}
                    className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:-translate-y-0.5 disabled:opacity-50"
                    style={{
                      background: 'linear-gradient(135deg,#7c3aed,#6366f1)',
                      boxShadow: '0 4px 24px rgba(124,58,237,0.4)',
                    }}
                  >
                    {isUpgrading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Loading Checkout...
                      </span>
                    ) : '⚡ Upgrade to Premium — $49/mo'}
                  </button>
                ) : (
                  <div
                    className="w-full py-2.5 rounded-xl text-sm font-bold text-center text-emerald-400"
                    style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}
                  >
                    ✓ Premium Active
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Danger zone */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
        <div className="mt-6 rounded-2xl p-6" style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.12)' }}>
          <h3 className="text-sm font-bold text-red-400 mb-1">Danger Zone</h3>
          <p className="text-xs text-slate-500">These actions are irreversible.</p>
          <button className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold text-red-400 transition-all hover:bg-red-500/10"
            style={{ border: '1px solid rgba(239,68,68,0.2)' }}
            onClick={() => showToast("Please contact support to delete your account.", 'error')}
          >
            Delete Account
          </button>
        </div>
      </motion.div>
    </div>
  );
}
