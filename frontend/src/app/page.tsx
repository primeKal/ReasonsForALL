'use client'

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState<'text' | 'logical'>('text');
  
  // Interactive mock queries for the live playground
  const mockQueries = {
    text: [
      {
        query: "Can an anonymous user delete a rating from the database?",
        verdict: "BLOCKED",
        isValid: false,
        latency: "4.2ms",
        reason: "Violates: User Identity Integrity. Anonymous users are strictly prohibited from performing write or delete operations on system records."
      },
      {
        query: "Can a customer submit a rating for an order they completed?",
        verdict: "PERMITTED",
        isValid: true,
        latency: "3.5ms",
        reason: "Complies with: Rating Eligibility. Users who completed an order are authorized to submit a single rating."
      },
      {
        query: "Can an unauthenticated guest user place a new order?",
        verdict: "BLOCKED",
        isValid: false,
        latency: "3.8ms",
        reason: "Violates: User Identity Integrity. Guest accounts must associate with a verified profile before checkout is permitted."
      }
    ],
    logical: [
      {
        query: "Waiter is-a Employee; Waiter placing transaction",
        verdict: "PERMITTED",
        isValid: true,
        latency: "1.9ms",
        reason: "Consistent logical association. Employee is authorized to place transactions, and Waiter is a valid sub-role of Employee."
      },
      {
        query: "Waiter disjointWith Buyer; Waiter placing Buyer transaction",
        verdict: "BLOCKED",
        isValid: false,
        latency: "2.1ms",
        reason: "Inconsistent assertion. Waiters are logically disjoint from Buyers, preventing them from performing buyer-exclusive transactions."
      }
    ]
  };

  const [selectedDemoIndex, setSelectedDemoIndex] = useState(0);
  const currentDemo = mockQueries[activeTab][selectedDemoIndex] || mockQueries[activeTab][0];

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 selection:bg-violet-500/30 selection:text-white">
      {/* Background glow effects */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-violet-600/10 blur-[150px] rounded-full -z-10 pointer-events-none"></div>
      <div className="absolute top-[30vh] right-1/4 w-[600px] h-[600px] bg-indigo-600/10 blur-[180px] rounded-full -z-10 pointer-events-none"></div>
      <div className="absolute bottom-10 left-1/3 w-[500px] h-[500px] bg-blue-600/10 blur-[150px] rounded-full -z-10 pointer-events-none"></div>

      {/* Header */}
      <header className="px-6 lg:px-14 h-20 flex items-center justify-between border-b border-white/5 backdrop-blur-md bg-slate-950/70 sticky top-0 z-50">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center font-extrabold text-white shadow-lg shadow-violet-500/20">
            R
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tight bg-gradient-to-r from-white via-slate-200 to-violet-400 bg-clip-text text-transparent">Ralles</span>
            <span className="text-[9px] text-violet-400 font-bold uppercase tracking-widest -mt-1">Reasons for Alles</span>
          </div>
        </div>
        <nav className="hidden md:flex items-center gap-8 font-semibold text-sm text-slate-400">
          <a href="#features" className="hover:text-violet-400 transition-colors">Features</a>
          <a href="#playground" className="hover:text-violet-400 transition-colors">Interactive Demo</a>
          <a href="#how-it-works" className="hover:text-violet-400 transition-colors">How it Works</a>
          <a href="#pricing" className="hover:text-violet-400 transition-colors">Pricing</a>
        </nav>
        <nav className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-semibold text-slate-400 hover:text-white transition-colors hidden sm:block">Sign In</Link>
          <Link href="/login">
            <Button className="rounded-xl px-5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold shadow-md shadow-violet-500/10 border border-violet-500/30 hover:-translate-y-0.5 transition-all">Get Started</Button>
          </Link>
        </nav>
      </header>
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="flex flex-col items-center justify-center px-6 lg:px-8 text-center pt-28 pb-24 relative overflow-hidden">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/5 px-4.5 py-1.5 text-xs font-bold text-violet-300 mb-8 backdrop-blur-sm shadow-inner">
            <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-ping"></span>
            <span>Ralles — Your Reasoning Assistant</span>
          </div>
          
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight max-w-5xl mx-auto mb-8 text-white leading-[1.15]">
            Deterministic Guardrails for <br className="hidden md:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-indigo-300 to-cyan-400">Autonomous AI Agents</span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-400 max-w-3xl mx-auto mb-10 leading-relaxed">
            We use state-of-the-art multi-agent systems and logical associations to provide accurate and hallucination-free reasoning and query guardrails. Ralles maps your database schemas to logic structures and intercepts agent intents to enforce zero-trust policies.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center w-full max-w-md mx-auto sm:max-w-none mb-16">
            <Link href="/login">
              <Button size="lg" className="rounded-xl px-8 h-12 text-base font-bold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-xl shadow-violet-500/20 border border-violet-500/30 hover:-translate-y-1 transition-all text-white w-full sm:w-auto">
                Start Free Trial
              </Button>
            </Link>
            <Link href="/dashboard/servers">
              <Button size="lg" variant="outline" className="rounded-xl px-8 h-12 text-base font-bold backdrop-blur-md bg-white/5 hover:bg-white/10 transition-all border-white/10 hover:border-white/20 text-slate-200 w-full sm:w-auto">
                Enter Dashboard
              </Button>
            </Link>
          </div>
        </section>

        {/* Live Playground Section */}
        <section id="playground" className="py-20 px-6 lg:px-14 border-y border-white/5 bg-slate-900/40 relative">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3 text-white">Live Guardrail Simulator</h2>
              <p className="text-slate-400 max-w-2xl mx-auto text-sm">Experience how Ralles inspects, verifies, and intercepts intents in sub-milliseconds.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              {/* Left Side: Select Query */}
              <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-violet-400 block mb-1">Select Reasoning Mode</span>
                  <div className="flex gap-1.5 p-1 bg-slate-950 border border-white/5 rounded-xl">
                    <button 
                      onClick={() => { setActiveTab('text'); setSelectedDemoIndex(0); }}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'text' ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      📋 Text Policies
                    </button>
                    <button 
                      onClick={() => { setActiveTab('logical'); setSelectedDemoIndex(0); }}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'logical' ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      🧪 Logical reasoning
                    </button>
                  </div>
                </div>

                <div className="space-y-3 flex-1 pt-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Select Agent intent</span>
                  <div className="space-y-2">
                    {mockQueries[activeTab].map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedDemoIndex(idx)}
                        className={`w-full p-4 rounded-xl text-left text-xs transition-all border ${selectedDemoIndex === idx ? 'bg-violet-500/10 border-violet-500/40 text-white' : 'bg-slate-950/60 border-white/5 text-slate-400 hover:border-white/10 hover:text-slate-200'}`}
                      >
                        <span className="font-semibold block mb-1">{activeTab === 'text' ? 'User Query:' : 'DL assertion:'}</span>
                        <code className="block break-words italic">"{item.query}"</code>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Side: Simulator Output Terminal */}
              <div className="lg:col-span-7 flex flex-col">
                <div className="flex-1 bg-slate-950 border border-white/10 rounded-2xl shadow-2xl relative overflow-hidden flex flex-col min-h-[350px]">
                  {/* Terminal Header */}
                  <div className="px-4 py-3 bg-slate-900 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-red-500/80"></span>
                      <span className="w-3 h-3 rounded-full bg-yellow-500/80"></span>
                      <span className="w-3 h-3 rounded-full bg-green-500/80"></span>
                      <span className="text-xs font-mono text-slate-400 ml-2">Ralles Engine Terminal v1.2</span>
                    </div>
                    <span className="text-[10px] font-mono text-violet-400">LATENCY: {currentDemo.latency}</span>
                  </div>

                  {/* Terminal Body */}
                  <div className="p-6 font-mono text-xs space-y-4 flex-1 overflow-y-auto">
                    <div>
                      <span className="text-slate-500 block mb-1">&gt; INCOMING INTENT VERIFICATION REQUEST:</span>
                      <code className="text-violet-300 block bg-slate-900/60 p-3 rounded-lg border border-white/5 italic">
                        "{currentDemo.query}"
                      </code>
                    </div>

                    <div>
                      <span className="text-slate-500 block mb-1">&gt; VERIFYING LOGICAL ASSOCIATION GRAPH:</span>
                      <span className="text-cyan-400 block animate-pulse">● Connecting schema policies... done</span>
                    </div>

                    <div className="pt-2">
                      <span className="text-slate-500 block mb-1">&gt; DECISION VERDICT:</span>
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded text-[10px] font-bold ${currentDemo.isValid ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                          {currentDemo.verdict}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 bg-white/5 rounded-lg border border-white/5 text-slate-300 mt-2 leading-relaxed">
                      <span className="font-bold text-slate-100 block mb-1">Reasoning steps:</span>
                      {currentDemo.reason}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Comparison Matrix */}
        <section className="py-20 px-6 lg:px-14 max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-white">Compare Guardrail Architectures</h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-sm">Why modern AI architectures need logical guardrails instead of probabilistic LLM filters.</p>
          </div>

          <div className="rounded-2xl border border-white/5 overflow-hidden shadow-xl overflow-x-auto bg-slate-900/20 backdrop-blur-md">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-950 border-b border-white/10 text-slate-300">
                <tr>
                  <th className="px-6 py-4">Capability</th>
                  <th className="px-6 py-4 text-violet-400 bg-violet-500/5 font-extrabold border-x border-violet-500/15">🛡️ Ralles Engine</th>
                  <th className="px-6 py-4">Standard LLM Filters</th>
                  <th className="px-6 py-4">Standard Vector RAG</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-400">
                <tr className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-bold text-white">Determinism</td>
                  <td className="px-6 py-4 font-bold text-green-400 bg-violet-500/5 border-x border-violet-500/15">100% Guaranteed</td>
                  <td className="px-6 py-4">Probabilistic (85-92%)</td>
                  <td className="px-6 py-4">Fuzzy Match Only</td>
                </tr>
                <tr className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-bold text-white">Hallucination Risk</td>
                  <td className="px-6 py-4 font-bold text-green-400 bg-violet-500/5 border-x border-violet-500/15">0% (Strict Logic Proof)</td>
                  <td className="px-6 py-4">High (prone to jailbreaks)</td>
                  <td className="px-6 py-4">High (context confusion)</td>
                </tr>
                <tr className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-bold text-white">Evaluation Speed</td>
                  <td className="px-6 py-4 font-bold text-white bg-violet-500/5 border-x border-violet-500/15">&lt; 5ms in-memory</td>
                  <td className="px-6 py-4 text-red-400">Slow (800ms - 2500ms)</td>
                  <td className="px-6 py-4">Medium (200ms - 500ms)</td>
                </tr>
                <tr className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-bold text-white">Schema Verification</td>
                  <td className="px-6 py-4 text-green-400 bg-violet-500/5 border-x border-violet-500/15">Deep structural mapping</td>
                  <td className="px-6 py-4">Implicit inference only</td>
                  <td className="px-6 py-4">None</td>
                </tr>
                <tr className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-bold text-white">Security / Privacy</td>
                  <td className="px-6 py-4 text-green-400 bg-violet-500/5 border-x border-violet-500/15">Stateless (No rows cached)</td>
                  <td className="px-6 py-4">Exposes sensitive vectors</td>
                  <td className="px-6 py-4">Requires document index copy</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Detailed Features Grid */}
        <section id="features" className="py-20 bg-slate-900/20 px-6 lg:px-14 border-t border-white/5">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight text-white">The Ralles Tech Stack</h2>
              <p className="text-slate-400 max-w-2xl mx-auto text-base">Accurate guardrails built on multi-agent synthesis and logical associations. Fully verified by <a href="https://reasons-for-all-i55a.vercel.app/" className="text-violet-400 hover:underline">reasons-for-all-i55a.vercel.app</a>.</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card className="border-white/5 shadow-lg bg-slate-950/60 backdrop-blur-sm hover:border-violet-500/20 transition-all group">
                <CardHeader>
                  <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center text-2xl mb-4 group-hover:scale-105 transition-transform">🤖</div>
                  <CardTitle className="text-white">Multi-Agent Schema Parser</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-400 leading-relaxed text-sm">
                    Our cooperative multi-agent swarm inspects database blueprints (relations, constraints, triggers, functions). Supports extremely large systems (like Odoo) with a optimized cap of 40 active tables/concepts, rules, and generated policies to ensure fast, failure-free schema parsing.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-white/5 shadow-lg bg-slate-950/60 backdrop-blur-sm hover:border-violet-500/20 transition-all group">
                <CardHeader>
                  <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center text-2xl mb-4 group-hover:scale-105 transition-transform">🧠</div>
                  <CardTitle className="text-white">Centralized Business Logic Agent</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-400 leading-relaxed text-sm">
                    Establish a single source of truth for business logic. You don't have to duplicate or hardcode rules inside every system, agent script, or downstream LLM context call.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-white/5 shadow-lg bg-slate-950/60 backdrop-blur-sm hover:border-violet-500/20 transition-all group">
                <CardHeader>
                  <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center text-2xl mb-4 group-hover:scale-105 transition-transform">🛑</div>
                  <CardTitle className="text-white">One-Click Logic Blocking</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-400 leading-relaxed text-sm">
                    A centralized control panel to immediately block all AI agents and connected client systems from executing specific logical actions or accessing certain resources globally.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-white/5 shadow-lg bg-slate-950/60 backdrop-blur-sm hover:border-violet-500/20 transition-all group">
                <CardHeader>
                  <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center text-2xl mb-4 group-hover:scale-105 transition-transform">⚠️</div>
                  <CardTitle className="text-white">Centralized Dangerous Attempts Hub</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-400 leading-relaxed text-sm">
                    A unified registry capturing all blocked requests, policy violations, and anomalous query patterns across all connected corporate applications.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-white/5 shadow-lg bg-slate-950/60 backdrop-blur-sm hover:border-violet-500/20 transition-all group">
                <CardHeader>
                  <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center text-2xl mb-4 group-hover:scale-105 transition-transform">📋</div>
                  <CardTitle className="text-white">Unified Audit Logging</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-400 leading-relaxed text-sm">
                    Thoroughly audit what each AI agent does. View detailed logical evaluation graphs, latency metrics, and reason traces to maintain complete transparency.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-white/5 shadow-lg bg-slate-950/60 backdrop-blur-sm hover:border-violet-500/20 transition-all group">
                <CardHeader>
                  <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center text-2xl mb-4 group-hover:scale-105 transition-transform">🛡️</div>
                  <CardTitle className="text-white">Zero Trust Firewall</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-400 leading-relaxed text-sm">
                    A stateless verification layer running in under 5 milliseconds. Catches impossible actions and privilege escalations before database queries are executed.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* How it Works Section */}
        <section id="how-it-works" className="py-24 px-6 lg:px-14 border-t border-white/5 relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-violet-600/5 blur-[200px] rounded-full pointer-events-none" />
          <div className="max-w-6xl mx-auto relative">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/5 px-4 py-1.5 text-xs font-bold text-violet-300 mb-6">
                <span className="w-1.5 h-1.5 bg-violet-400 rounded-full" />
                Under the Hood
              </div>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 text-white">
                How Ralles Works
              </h2>
              <p className="text-slate-400 max-w-2xl mx-auto text-base">
                From raw database schema to deterministic AI guardrails in five automated steps.
              </p>
            </div>

            {/* Step flow */}
            <div className="relative">
              {/* Connector line (desktop) */}
              <div className="hidden lg:block absolute top-[52px] left-[calc(10%+28px)] right-[calc(10%+28px)] h-0.5"
                style={{ background: 'linear-gradient(90deg, #7c3aed22, #7c3aed88, #6366f188, #0ea5e988, #0ea5e922)' }}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 lg:gap-4">
                {[
                  {
                    step: '01',
                    icon: '🗄️',
                    color: 'from-violet-600 to-violet-500',
                    glow: 'rgba(124,58,237,0.3)',
                    title: 'Connect Database',
                    desc: 'Paste your DB connection string — PostgreSQL, MySQL, or SQL Server. Ralles never stores row data, only the structural schema.',
                  },
                  {
                    step: '02',
                    icon: '🤖',
                    color: 'from-indigo-600 to-indigo-500',
                    glow: 'rgba(99,102,241,0.3)',
                    title: 'Multi-Agent Parsing',
                    desc: 'A cooperative agent swarm inspects relations, constraints, triggers, and functions to extract business semantics automatically.',
                  },
                  {
                    step: '03',
                    icon: '🕸️',
                    color: 'from-blue-600 to-cyan-500',
                    glow: 'rgba(59,130,246,0.3)',
                    title: 'Association Mapping',
                    desc: 'Business entities and guardrail rules are mapped into a logical association graph stored in your private tenant memory.',
                  },
                  {
                    step: '04',
                    icon: '🧠',
                    color: 'from-cyan-600 to-teal-500',
                    glow: 'rgba(6,182,212,0.3)',
                    title: 'Association Graph',
                    desc: 'Entities and associations form an interactive graph you can explore and export to any graph database.',
                  },
                  {
                    step: '05',
                    icon: '🛡️',
                    color: 'from-emerald-600 to-green-500',
                    glow: 'rgba(16,185,129,0.3)',
                    title: 'Runtime Guardrails',
                    desc: 'Every AI agent intent is verified against the logical association map in < 5ms. Tautologies are permitted; all others are blocked.',
                  },
                ].map((item, i) => (
                  <div key={i} className="flex flex-col items-center text-center group">
                    {/* Icon circle */}
                    <div
                      className="relative w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-5 transition-transform group-hover:-translate-y-1 group-hover:scale-105"
                      style={{
                        background: `linear-gradient(135deg, ${item.color.replace('from-', '').replace(' to-', ', ')})`.replace('from-', '').replace(' to-', ', '),
                        boxShadow: `0 0 24px ${item.glow}`,
                      }}
                    >
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
                        style={{ background: `linear-gradient(135deg, var(--tw-gradient-from, #7c3aed), var(--tw-gradient-to, #6366f1))` }}
                      >
                        {item.icon}
                      </div>
                      {/* Step number badge */}
                      <div
                        className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white border border-slate-950"
                        style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}
                      >
                        {i + 1}
                      </div>
                    </div>

                    <h3 className="font-bold text-white text-base mb-2 group-hover:text-violet-300 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-slate-400 text-xs leading-relaxed max-w-[180px]">
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Flow arrows summary bar */}
            <div className="mt-16 rounded-2xl border border-white/5 bg-slate-900/40 backdrop-blur-sm p-6 overflow-x-auto">
              <div className="flex items-center gap-0 min-w-max mx-auto w-fit">
                {[
                  { label: 'Your DB', icon: '🗄️', sublabel: 'postgres / mysql' },
                  { label: 'Schema Parser', icon: '🤖', sublabel: 'multi-agent swarm' },
                  { label: 'Association Map', icon: '📐', sublabel: 'logical memory' },
                  { label: 'Association Graph', icon: '🕸️', sublabel: 'explore & export' },
                  { label: 'Reasoning Engine', icon: '🧠', sublabel: '< 5ms guardrail check' },
                  { label: 'AI Agent', icon: '✅', sublabel: 'Permitted or Blocked' },
                ].map((node, i, arr) => (
                  <div key={i} className="flex items-center">
                    <div className="flex flex-col items-center gap-1.5 px-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 border border-white/8 flex items-center justify-center text-lg">
                        {node.icon}
                      </div>
                      <span className="text-white text-[10px] font-bold whitespace-nowrap">{node.label}</span>
                      <span className="text-slate-500 text-[9px] whitespace-nowrap">{node.sublabel}</span>
                    </div>
                    {i < arr.length - 1 && (
                      <div className="flex flex-col items-center -mx-1">
                        <svg width="28" height="12" viewBox="0 0 28 12">
                          <path d="M0 6 H22 M18 2 L26 6 L18 10" stroke="rgba(139,92,246,0.6)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-20 bg-slate-950/40 px-6 lg:px-14 border-t border-white/5">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight text-white">Simple, predictable pricing</h2>
              <p className="text-slate-400 max-w-2xl mx-auto text-base">Secure your autonomous agent operations today.</p>
            </div>
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <Card className="border-white/5 shadow-md bg-slate-950/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-2xl text-white">Developer Trial</CardTitle>
                  <CardDescription>Perfect for proof-of-concepts and exploration.</CardDescription>
                  <div className="mt-4 text-4xl font-black text-white">$0<span className="text-lg text-slate-400 font-normal"> / 30 days</span></div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 text-slate-400 text-xs">
                    <li className="flex items-center gap-2"><span>✓</span> PostgreSQL, MySQL, SQL Server</li>
                    <li className="flex items-center gap-2"><span>✓</span> Full API Logger Access</li>
                    <li className="flex items-center gap-2"><span>✓</span> Up to 1000 Mapped Rules</li>
                    <li className="flex items-center gap-2"><span>✓</span> Single-tenant memory isolation</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-violet-500/40 shadow-2xl bg-slate-950/60 backdrop-blur-sm relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-violet-600 via-indigo-500 to-cyan-500"></div>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-2xl text-violet-400">Enterprise Premium</CardTitle>
                      <CardDescription>For production AI agent swarms.</CardDescription>
                    </div>
                    <span className="bg-violet-500/10 border border-violet-500/30 text-violet-400 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">RECOMMENDED</span>
                  </div>
                  <div className="mt-4 text-4xl font-black text-white">Custom</div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 text-slate-400 text-xs">
                    <li className="flex items-center gap-2"><span>✓</span> Custom Connection Drivers</li>
                    <li className="flex items-center gap-2"><span>✓</span> Uncapped Rule Count Mappings</li>
                    <li className="flex items-center gap-2"><span>✓</span> Real-Time Webhook Schema Sync</li>
                    <li className="flex items-center gap-2"><span>✓</span> High-Availability API clusters</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/5 py-12 px-6 lg:px-14 bg-slate-950">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center font-extrabold text-white text-xs">R</div>
            <span className="font-bold tracking-tight text-sm text-slate-200">Ralles Inc.</span>
          </div>
          <p className="text-xs text-slate-500">© 2026 Ralles Inc. All rights reserved. Reasons for Alles.</p>
        </div>
      </footer>
    </div>
  );
}
