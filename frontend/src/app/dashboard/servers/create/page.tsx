"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

const STEPS = [
  {
    num: 1,
    title: "Server Name",
    icon: "🏷️",
    desc: "Give your Server a recognizable name.",
  },
  {
    num: 2,
    title: "Database Dialect",
    icon: "⚙️",
    desc: "Select your relational database engine.",
  },
  {
    num: 3,
    title: "Secure Connection",
    icon: "🔒",
    desc: "Provide a connection string. Ralles only reads schema metadata, never row data.",
  },
  {
    num: 4,
    title: "LLM Configuration",
    icon: "🧠",
    desc: "Configure a custom OpenAI or Gemini API key (optional).",
  },
];

const EXTRACTION_STEPS = [
  "Connecting to database & reflecting schema",
  "Mapping tables to domain concepts (Concept Agent)",
  "Extracting relationships & logical constraints (Rules Agent)",
  "Identifying class hierarchies & inheritance (Hierarchy Agent)",
  "Augmenting logic patterns from codebase (Git Agent)",
  "Compiling & synthesizing policies"
];


export default function CreateServerWizard() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    dialect: "postgresql",
    connectionString: "",
    repoUrl: "",
    llmProvider: "gemini",
    llmApiKey: "",
    customPolicies: "",
  });
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractionStep, setExtractionStep] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push("/login");
    });
  }, []);

  useEffect(() => {
    let interval: any;
    if (isExtracting) {
      setExtractionStep(0);
      interval = setInterval(() => {
        setExtractionStep((prev) => (prev < 5 ? prev + 1 : prev));
      }, 3500);
    } else {
      setExtractionStep(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isExtracting]);

  const handleConnect = async () => {
    setError(null);
    setIsExtracting(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/tenant/connect`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            server_name: formData.name,
            connection_string: formData.connectionString,
            repo_url: formData.repoUrl,
            llm_provider: formData.llmProvider,
            llm_api_key: formData.llmApiKey,
            custom_policies: formData.customPolicies,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to connect");
      router.push(`/dashboard/servers/${data.server_id}`);
    } catch (err: any) {
      setError(
        err.message ||
          "Failed to extract schema from database connection string.",
      );
      setIsExtracting(false);
    }
  };

  const dialects = [
    { value: "postgresql", label: "PostgreSQL", icon: "🐘" },
    { value: "mysql", label: "MySQL", icon: "🐬" },
    { value: "sqlserver", label: "SQL Server", icon: "🏢" },
  ];

  const cardStyle = {
    background: "rgba(15,23,42,0.8)",
    border: "1px solid rgba(99,102,241,0.2)",
    boxShadow: "0 0 60px rgba(99,102,241,0.08)",
    backdropFilter: "blur(16px)",
  };

  const inputStyle =
    "bg-slate-900/80 border-white/10 text-white placeholder:text-slate-500 focus:border-violet-500/50 h-11";

  return (
    <div className="px-6 lg:px-14 py-16 max-w-2xl mx-auto">
      {/* Page title */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/5 px-4 py-1.5 text-xs font-bold text-violet-300 mb-6">
          <span className="w-1.5 h-1.5 bg-violet-400 rounded-full" />
          New Server
        </div>
        <h1 className="text-4xl font-extrabold text-white tracking-tight mb-3">
          Connect Database
        </h1>
        <p className="text-slate-400 text-base">
          Connect your database to automatically power your intelligent
          reasoning guardrails.
        </p>
      </div>

      {/* Step indicators */}
      <div className="flex items-center justify-center gap-0 mb-10">
        {STEPS.map((s, i) => (
          <div key={s.num} className="flex items-center">
            <div className="flex flex-col items-center gap-2">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all"
                style={{
                  background:
                    step >= s.num
                      ? "linear-gradient(135deg,#7c3aed,#6366f1)"
                      : "rgba(255,255,255,0.04)",
                  border:
                    step >= s.num
                      ? "2px solid rgba(124,58,237,0.5)"
                      : "2px solid rgba(255,255,255,0.1)",
                  color: step >= s.num ? "#fff" : "#64748b",
                  boxShadow:
                    step >= s.num ? "0 0 20px rgba(124,58,237,0.4)" : "none",
                }}
              >
                {step > s.num ? "✓" : s.num}
              </div>
              <span
                className="text-[10px] font-semibold hidden sm:block"
                style={{ color: step >= s.num ? "#c4b5fd" : "#475569" }}
              >
                {s.title}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className="w-12 sm:w-16 h-0.5 mx-2 mb-5 transition-all"
                style={{
                  background:
                    step > s.num
                      ? "linear-gradient(90deg,#7c3aed,#6366f1)"
                      : "rgba(255,255,255,0.06)",
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Card */}
      <div className="rounded-2xl overflow-hidden" style={cardStyle}>
        <div
          style={{
            height: 3,
            background: "linear-gradient(90deg,#7c3aed,#6366f1,#0ea5e9)",
          }}
        />

        <div className="p-8">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-xl font-bold text-white mb-1">
                    Server Details
                  </h2>
                  <p className="text-slate-400 text-sm">{STEPS[0].desc}</p>
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="name"
                    className="text-slate-300 text-xs font-semibold"
                  >
                    Server Name
                  </Label>
                  <Input
                    id="name"
                    placeholder="e.g. Production Identity DB"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className={inputStyle}
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="repo"
                    className="text-slate-300 text-xs font-semibold"
                  >
                    Repository URL (optional)
                  </Label>
                  <Input
                    id="repo"
                    placeholder="https://github.com/org/repo"
                    value={formData.repoUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, repoUrl: e.target.value })
                    }
                    className={inputStyle}
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="custom-policies"
                    className="text-slate-300 text-xs font-semibold"
                  >
                    Custom Policies &amp; Guardrail Rules (optional)
                  </Label>
                  <textarea
                    id="custom-policies"
                    placeholder="Copy-paste raw text policies or upload a text file. e.g. Waiters cannot access billing tables."
                    value={formData.customPolicies}
                    onChange={(e) =>
                      setFormData({ ...formData, customPolicies: e.target.value })
                    }
                    className="w-full min-h-[80px] p-3 rounded-md border border-white/10 bg-slate-900/80 text-white placeholder:text-slate-500 text-xs focus:border-violet-500/50 focus:outline-none"
                  />
                  <div className="flex items-center gap-2 mt-1">
                    <label className="px-2.5 py-1 rounded bg-white/5 border border-white/10 text-slate-300 text-[10px] font-bold cursor-pointer hover:bg-white/10 transition-all">
                      📁 Upload text file
                      <input
                        type="file"
                        accept=".txt,.md"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          const r = new FileReader()
                          r.onload = (ev) => {
                            if (ev.target?.result) {
                              setFormData({ ...formData, customPolicies: ev.target.result as string })
                            }
                          }
                          r.readAsText(file)
                        }}
                      />
                    </label>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-xl font-bold text-white mb-1">
                    Engine Profile
                  </h2>
                  <p className="text-slate-400 text-sm">{STEPS[1].desc}</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {dialects.map((d) => (
                    <button
                      key={d.value}
                      onClick={() =>
                        setFormData({ ...formData, dialect: d.value })
                      }
                      className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all"
                      style={{
                        background:
                          formData.dialect === d.value
                            ? "rgba(124,58,237,0.15)"
                            : "rgba(255,255,255,0.03)",
                        border:
                          formData.dialect === d.value
                            ? "1px solid rgba(124,58,237,0.5)"
                            : "1px solid rgba(255,255,255,0.07)",
                      }}
                    >
                      <span className="text-2xl">{d.icon}</span>
                      <span
                        className="text-xs font-semibold"
                        style={{
                          color:
                            formData.dialect === d.value
                              ? "#c4b5fd"
                              : "#94a3b8",
                        }}
                      >
                        {d.label}
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-xl font-bold text-white mb-1">
                    Secure Connection
                  </h2>
                  <p className="text-slate-400 text-sm">{STEPS[2].desc}</p>
                </div>

                {/* Security note */}
                <div
                  className="p-3.5 rounded-xl text-xs text-emerald-400 flex items-start gap-2.5"
                  style={{
                    background: "rgba(16,185,129,0.07)",
                    border: "1px solid rgba(16,185,129,0.2)",
                  }}
                >
                  <span className="flex-shrink-0 mt-0.5">🛡️</span>
                  <span>
                    Ralles only reads structural schema metadata (tables,
                    columns, constraints). Row data and sensitive values are
                    never accessed or stored.
                  </span>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="conn"
                    className="text-slate-300 text-xs font-semibold"
                  >
                    Connection URI
                  </Label>
                  <Input
                    id="conn"
                    type="password"
                    autoComplete="new-password"
                    placeholder={`${formData.dialect}://user:pass@host:port/db`}
                    value={formData.connectionString}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        connectionString: e.target.value,
                      })
                    }
                    className={inputStyle}
                  />
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-xl font-bold text-white mb-1">
                    Custom LLM Provider
                  </h2>
                  <p className="text-slate-400 text-sm">{STEPS[3].desc}</p>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="llm-provider"
                    className="text-slate-300 text-xs font-semibold"
                  >
                    LLM Provider
                  </Label>
                  <select
                    id="llm-provider"
                    value={formData.llmProvider}
                    onChange={(e: any) =>
                      setFormData({ ...formData, llmProvider: e.target.value })
                    }
                    className="flex h-11 w-full items-center justify-between rounded-md border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="gemini">Google Gemini (Default)</option>
                    <option value="openai">OpenAI (GPT-4o-mini)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="llm-api-key"
                    className="text-slate-300 text-xs font-semibold"
                  >
                    API Key (Optional)
                  </Label>
                  <Input
                    id="llm-api-key"
                    type="password"
                    value={formData.llmApiKey}
                    onChange={(e) =>
                      setFormData({ ...formData, llmApiKey: e.target.value })
                    }
                    placeholder="Enter your provider's API key"
                    className={inputStyle}
                  />
                  <p className="text-xs text-slate-500">
                    {formData.llmProvider === "openai"
                      ? "Required format: sk-proj-... or sk-..."
                      : "Required format: AIzaSy..."}
                  </p>
                </div>

                {isExtracting && (
                  <div
                    className="p-5 rounded-xl text-sm text-left space-y-4"
                    style={{
                      background: "rgba(99,102,241,0.05)",
                      border: "1px solid rgba(99,102,241,0.15)",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-4 h-4 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
                        <p className="text-violet-300 font-semibold">
                          Analyzing schema & extracting business logic guardrails...
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowDetails(!showDetails)}
                        className="text-xs text-violet-400 hover:text-violet-300 hover:underline font-bold"
                      >
                        {showDetails ? "Hide Steps ▴" : "Show Steps ▾"}
                      </button>
                    </div>

                    {showDetails && (
                      <div className="border-t border-white/5 pt-3 space-y-2.5 font-mono text-[11px] text-slate-400">
                        {EXTRACTION_STEPS.map((stepDesc, idx) => {
                          const isDone = extractionStep > idx;
                          const isActive = extractionStep === idx;
                          return (
                            <div key={idx} className="flex items-center gap-2.5">
                              <span>
                                {isDone ? (
                                  <span className="text-emerald-400 font-bold">✓</span>
                                ) : isActive ? (
                                  <span className="w-2.5 h-2.5 border border-violet-400/30 border-t-violet-400 rounded-full animate-spin inline-block" />
                                ) : (
                                  <span className="text-slate-600">○</span>
                                )}
                              </span>
                              <span className={isActive ? "text-violet-300 font-bold" : isDone ? "text-slate-300" : "text-slate-500"}>
                                {stepDesc}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {error && (
                  <div
                    className="p-4 rounded-xl text-sm text-red-400"
                    style={{
                      background: "rgba(239,68,68,0.07)",
                      border: "1px solid rgba(239,68,68,0.2)",
                    }}
                  >
                    ❌ {error}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation buttons */}
          <div
            className="flex justify-between mt-8 pt-6"
            style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
          >
            <button
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 1 || isExtracting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ border: "1px solid rgba(255,255,255,0.1)" }}
            >
              ← Back
            </button>

            {step < 4 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                disabled={
                  (step === 1 && !formData.name) ||
                  (step === 3 && !formData.connectionString)
                }
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: "linear-gradient(135deg,#7c3aed,#6366f1)",
                  boxShadow: "0 4px 20px rgba(124,58,237,0.35)",
                }}
              >
                Next Step →
              </button>
            ) : (
              <button
                onClick={handleConnect}
                disabled={isExtracting}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: isExtracting
                    ? "rgba(124,58,237,0.5)"
                    : "linear-gradient(135deg,#7c3aed,#6366f1)",
                  boxShadow: "0 4px 20px rgba(124,58,237,0.35)",
                }}
              >
                {isExtracting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Connecting...
                  </>
                ) : (
                  "🔗 Connect & Map Schema"
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
