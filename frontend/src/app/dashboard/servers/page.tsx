'use client'

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function ServersPage() {
  const [servers, setServers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function loadServers() {
      setLoading(true);
      setError(null);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/tenant/servers`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || `Request failed with status ${res.status}`);
        }
        setServers(await res.json());
      } catch (e: any) {
        setError(e.message || 'Failed to load servers. Make sure the backend is running.');
      } finally {
        setLoading(false);
      }
    }
    loadServers();
  }, []);

  const formatSynced = (ts: string) => {
    if (!ts || ts === 'recently') return 'recently';
    try { return new Date(ts).toLocaleString(); } catch { return ts; }
  };

  const cardStyle = {
    background: 'rgba(15,23,42,0.7)',
    border: '1px solid rgba(255,255,255,0.07)',
    backdropFilter: 'blur(12px)',
  };

  return (
    <div className="px-6 lg:px-14 py-12 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/5 px-3 py-1 text-xs font-bold text-violet-300 mb-4">
            <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-ping" />
            Active workspace
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white">Servers</h1>
          <p className="text-slate-400 mt-2 text-base">
            Manage your connected databases and dynamic business guardrails.
          </p>
        </div>
        <Link href="/dashboard/servers/create">
          <button
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white transition-all hover:-translate-y-0.5"
            style={{
              background: 'linear-gradient(135deg,#7c3aed,#6366f1)',
              boxShadow: '0 4px 24px rgba(124,58,237,0.4)',
            }}
          >
            + Connect Database
          </button>
        </Link>
      </div>

      {/* Divider */}
      <div className="h-px mb-10" style={{ background: 'linear-gradient(90deg,rgba(99,102,241,0.3),transparent)' }} />

      {/* States */}
      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-2xl p-6 animate-pulse" style={cardStyle}>
              <div className="h-5 bg-white/5 rounded-lg w-3/4 mb-3" />
              <div className="h-3 bg-white/5 rounded-lg w-1/2 mb-6" />
              <div className="h-2 bg-white/5 rounded-full w-full" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-8 rounded-2xl border border-red-500/20 bg-red-500/5 text-center">
          <p className="text-red-400 font-medium mb-4">⚠️ {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-xl border border-white/10 text-sm text-slate-300 hover:bg-white/5 transition-all"
          >
            Retry
          </button>
        </div>
      ) : servers.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-24 text-center rounded-2xl"
          style={{ border: '1px dashed rgba(99,102,241,0.25)', background: 'rgba(99,102,241,0.03)' }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-6"
            style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}
          >
            🗄️
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No servers connected</h3>
          <p className="text-slate-400 mb-8 max-w-sm text-sm">
            Connect your first relational database to generate your business logic firewall.
          </p>
          <Link href="/dashboard/servers/create">
            <button
              className="px-6 py-2.5 rounded-xl font-bold text-sm text-white transition-all hover:-translate-y-0.5"
              style={{
                background: 'linear-gradient(135deg,#7c3aed,#6366f1)',
                boxShadow: '0 4px 24px rgba(124,58,237,0.35)',
              }}
            >
              Connect Database
            </button>
          </Link>
        </motion.div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {servers.map((server, i) => (
            <motion.div
              key={server.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <Link href={`/dashboard/servers/${server.id}`} className="block group">
                <div
                  className="rounded-2xl p-6 relative overflow-hidden transition-all duration-300 group-hover:-translate-y-1"
                  style={{
                    ...cardStyle,
                    boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.border = '1px solid rgba(124,58,237,0.4)';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 48px rgba(124,58,237,0.2)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.border = '1px solid rgba(255,255,255,0.07)';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 24px rgba(0,0,0,0.3)';
                  }}
                >
                  {/* Top accent line */}
                  <div
                    className="absolute inset-x-0 top-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: 'linear-gradient(90deg,#7c3aed,#6366f1,#0ea5e9)' }}
                  />

                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                      style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.2)' }}
                    >
                      🗄️
                    </div>
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                      style={{ background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)' }}
                    >
                      {server.status}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white mb-1 group-hover:text-violet-300 transition-colors">{server.name}</h3>
                  <p className="text-slate-500 text-xs mb-5 uppercase tracking-wider">{server.dialect}</p>

                  {/* Rules progress */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Active Associations</span>
                      <span className="font-bold text-violet-400">{server.rules} / 40</span>
                    </div>
                    <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div
                        className="h-1.5 rounded-full"
                        style={{
                          width: `${Math.min((server.rules / 40) * 100, 100)}%`,
                          background: 'linear-gradient(90deg,#7c3aed,#6366f1)',
                        }}
                      />
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-5 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <span className="text-[11px] text-slate-500">Synced {formatSynced(server.synced)}</span>
                    <span className="text-xs font-bold text-violet-400 group-hover:text-violet-300 flex items-center gap-1 transition-colors">
                      View Guardrails
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6h8M6 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
