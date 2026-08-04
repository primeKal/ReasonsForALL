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
          <a href="https://github.com/primeKal/ReasonsForALL" target="_blank" rel="noopener noreferrer" className="hover:text-violet-400 transition-colors">GitHub</a>
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
            <span>Ralles — Multi-Agent Business Logic Guardrails</span>
          </div>
          
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight max-w-5xl mx-auto mb-8 text-white leading-[1.15]">
            Validate Every Action. <br className="hidden md:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-indigo-300 to-cyan-400">Catch Every Destructive Command.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-400 max-w-3xl mx-auto mb-10 leading-relaxed">
            Ralles (<em>Reasons for All</em>) is a multi-agent system that reads your database schema, extracts the business rules buried inside it, and builds a centralized guardrail server — so every AI agent in your stack enforces the same logic, automatically.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center w-full max-w-md mx-auto sm:max-w-none mb-6">
            <Link href="/login">
              <Button size="lg" className="rounded-xl px-8 h-12 text-base font-bold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-xl shadow-violet-500/20 border border-violet-500/30 hover:-translate-y-1 transition-all text-white w-full sm:w-auto">
                Sign Up
              </Button>
            </Link>
            <Link href="/dashboard/servers">
              <Button size="lg" variant="outline" className="rounded-xl px-8 h-12 text-base font-bold backdrop-blur-md bg-white/5 hover:bg-white/10 transition-all border-white/10 hover:border-white/20 text-slate-200 w-full sm:w-auto">
                Enter Dashboard
              </Button>
            </Link>
            <a href="https://github.com/primeKal/ReasonsForALL" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="rounded-xl px-8 h-12 text-base font-bold backdrop-blur-md bg-slate-900 border-violet-500/30 hover:border-violet-500/60 text-violet-300 hover:text-white transition-all w-full flex items-center justify-center gap-2">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.577.688.479C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                </svg>
                GitHub Repository
              </Button>
            </a>
          </div>

          {/* Quick Clone / Fork Terminal */}
          <div className="w-full max-w-xl mx-auto mt-8 p-5 rounded-2xl border border-white/5 bg-slate-950/60 backdrop-blur-md text-left font-mono text-xs">
            <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
              <span className="text-slate-500 uppercase tracking-widest text-[9px] font-bold">Clone & Run Locally</span>
              <span className="text-[9px] text-slate-500">Fork on GitHub to contribute</span>
            </div>
            <div className="space-y-1.5 text-slate-300">
              <p className="text-slate-500"># 1. Clone the repository</p>
              <div className="flex items-center justify-between bg-black/40 px-3.5 py-2.5 rounded-xl border border-white/5 select-all">
                <code>git clone https://github.com/primeKal/ReasonsForALL.git</code>
              </div>
              <p className="text-slate-500 pt-2"># 2. Start the backend & frontend</p>
              <div className="bg-black/40 px-3.5 py-2.5 rounded-xl border border-white/5">
                <code className="block text-slate-400">cd ReasonsForALL/backend && pip install -r requirements.txt</code>
                <code className="block text-slate-400">cd ../frontend && npm install && npm run dev</code>
              </div>
            </div>
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
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Select a query to test</span>
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
                      <span className="text-slate-500 block mb-1">&gt; GUARDRAIL VERIFICATION REQUEST:</span>
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
                Connect your database and Ralles does the rest. A cooperative multi-agent pipeline extracts your schema, infers your business rules, and sets up a live guardrail server your AI agents can validate against.
              </p>
            </div>

            {/* Step flow */}
            <div className="relative">
              {/* Connector line (desktop) */}
              <div className="hidden lg:block absolute top-[52px] left-[calc(10%+28px)] right-[calc(10%+28px)] h-0.5"
                style={{ background: 'linear-gradient(90deg, #7c3aed22, #7c3aed88, #6366f188, #0ea5e988, #0ea5e922)' }}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-4 mb-8">
                {[
                  {
                    step: '01',
                    icon: '🗄️',
                    color: 'from-violet-600 to-violet-500',
                    glow: 'rgba(124,58,237,0.3)',
                    title: 'Connect Database',
                    desc: 'Paste your DB connection string. Ralles connects and reads only the structural schema — never your row data.',
                  },
                  {
                    step: '02',
                    icon: '📐',
                    color: 'from-indigo-600 to-indigo-500',
                    glow: 'rgba(99,102,241,0.3)',
                    title: 'Extract Tables & FKs',
                    desc: 'Extracts all tables, foreign key relationships, triggers, and functions from your specified schema.',
                  },
                  {
                    step: '03',
                    icon: '🤖',
                    color: 'from-blue-600 to-cyan-500',
                    glow: 'rgba(59,130,246,0.3)',
                    title: 'Concept Models',
                    desc: 'LLM synthesizes all schema data into concept models — the equivalents of Classes, Entities, or Tables in your business domain.',
                  },
                  {
                    step: '04',
                    icon: '🔗',
                    color: 'from-cyan-600 to-teal-500',
                    glow: 'rgba(6,182,212,0.3)',
                    title: 'Is-A & Is-Like',
                    desc: 'LLM extracts hierarchical and similarity relationships between concept models (e.g. Waiter is-a Employee).',
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-4">
                {[
                  {
                    step: '05',
                    icon: '🕸️',
                    color: 'from-purple-600 to-fuchsia-500',
                    glow: 'rgba(168,85,247,0.3)',
                    title: 'Has & Aggregate Rules',
                    desc: 'Extracts cardinality and composition relationships — e.g. a Customer has many Orders, an Order aggregates OrderItems.',
                  },
                  {
                    step: '06',
                    icon: '💻',
                    color: 'from-rose-600 to-pink-500',
                    glow: 'rgba(244,63,94,0.3)',
                    title: 'Repo Code Supplement',
                    desc: 'Optionally complements the logic with an LLM call over your repo source code for even richer business context.',
                  },
                  {
                    step: '07',
                    icon: '💾',
                    color: 'from-amber-600 to-orange-500',
                    glow: 'rgba(245,158,11,0.3)',
                    title: 'Save to Quad Store',
                    desc: 'All concepts, rules, and relationships are saved into a Supabase quad-typed table — your private guardrail memory.',
                  },
                  {
                    step: '08',
                    icon: '🛡️',
                    color: 'from-emerald-600 to-green-500',
                    glow: 'rgba(16,185,129,0.3)',
                    title: 'Query Your Server',
                    desc: 'Ask natural-language questions like "Can a customer delete other people\'s reviews?" — via dashboard or API.',
                  },
                ].map((item, i) => (
                  <div key={i} className="flex flex-col items-center text-center group">
                    <div
                      className="relative w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-5 transition-transform group-hover:-translate-y-1 group-hover:scale-105"
                      style={{ boxShadow: `0 0 24px ${item.glow}` }}
                    >
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
                        style={{ background: `linear-gradient(135deg, var(--tw-gradient-from, #7c3aed), var(--tw-gradient-to, #6366f1))` }}
                      >
                        {item.icon}
                      </div>
                      <div
                        className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white border border-slate-950"
                        style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}
                      >
                        {i + 5}
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
          </div>
        </section>

        {/* Future Roadmap Section */}
        <section className="py-20 px-6 lg:px-14 border-t border-white/5 bg-slate-900/20">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/5 px-4 py-1.5 text-xs font-bold text-violet-300 mb-6">
                <span className="w-1.5 h-1.5 bg-violet-400 rounded-full" />
                What&apos;s Coming
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-white">Future Roadmap</h2>
              <p className="text-slate-400 max-w-2xl mx-auto text-sm">We&apos;re just getting started. Here&apos;s what we&apos;re building next for Ralles.</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { icon: '🤝', title: 'Agent-to-Agent Communication', desc: 'Enable Ralles servers to communicate and share guardrail context across multi-agent pipelines.' },
                { icon: '🔌', title: 'MCP Server Support', desc: 'Native Model Context Protocol server capabilities so any MCP-compatible agent can plug directly into Ralles.' },
                { icon: '🧮', title: 'LORP-Based Logical Reasoning', desc: 'Enhanced guardrail engine based on the LORP paper — supporting open and closed world assumption modes, configurable from the dashboard.' },
                { icon: '🐍', title: 'Python Package', desc: 'A simple pip-installable package so Python-based AI projects can query Ralles with a single import and one line of code.' },
                { icon: '📑', title: 'Richer Text Rules Extraction', desc: 'More comprehensive extraction of natural-language business rules from schema, triggers, and source code.' },
                { icon: '⚙️', title: 'Extraction Config UI', desc: 'A visual dashboard to configure which tables, schemas, and functions are included in each guardrail extraction run.' },
                { icon: '🔄', title: 'Re-Sync UI', desc: 'A one-click interface to re-sync your database connection and refresh guardrail data when your schema evolves.' },
                { icon: '🌐', title: 'Expanded Public Site', desc: 'More content explaining what Ralles is, the problem it solves, real use-cases, and step-by-step onboarding guides.' },
              ].map((item, i) => (
                <div key={i} className="flex gap-4 p-5 rounded-xl border border-white/5 bg-slate-950/50 backdrop-blur-sm hover:border-violet-500/20 transition-all group">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-xl flex-shrink-0 group-hover:scale-105 transition-transform">{item.icon}</div>
                  <div>
                    <h3 className="font-bold text-white text-sm mb-1">{item.title}</h3>
                    <p className="text-slate-400 text-xs leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
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
