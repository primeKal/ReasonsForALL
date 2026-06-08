'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

const sidebarLinks = [
  { href: '#introduction', label: 'Introduction', icon: '📖' },
  { href: '#quickstart', label: 'Quickstart', icon: '🚀' },
  { href: '#custom-llms', label: 'Custom LLMs', icon: '🤖' },
  { href: '#dev-databases', label: 'Dev & Sandbox DBs', icon: '🗄️' },
  { href: '#api-reference', label: 'API Reference', icon: '⚡' },
  { href: '#sdk-examples', label: 'SDK & Frameworks', icon: '🔧' },
  { href: '#privacy-policy', label: 'Privacy Policy', icon: '🔒' },
]

const cardGlass = {
  background: 'rgba(15,23,42,0.7)',
  border: '1px solid rgba(255,255,255,0.07)',
  backdropFilter: 'blur(12px)',
  borderRadius: '1rem',
}

const codeBlockStyle = {
  background: 'rgba(2,8,23,0.9)',
  border: '1px solid rgba(99,102,241,0.2)',
  borderRadius: '0.75rem',
  padding: '1.25rem',
  overflowX: 'auto' as const,
  fontFamily: 'ui-monospace, monospace',
  fontSize: '0.8rem',
  lineHeight: '1.7',
  color: '#c4b5fd',
}

export default function DocsPage() {
  const [copiedText, setCopiedText] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState('introduction')

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedText(id)
    setTimeout(() => setCopiedText(null), 2000)
  }

  const codeBlocks = {
    curl: `curl -X POST https://api.ralles.com/v1/verify \\
  -H "Authorization: Bearer sk-rfa-..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "server_id": "srv_db_prod_9012",
    "agent_query": "SELECT * FROM users WHERE role = \\'admin\\'",
    "context": {
      "user_id": "usr_789",
      "session_id": "sess_456"
    }
  }'`,
    langchain: `from langchain.chains import LLMChain
from langchain.prompts import PromptTemplate
from ralles import RallesGuardrail

# Initialize the Ralles logical guardrail
guardrail = RallesGuardrail(
    server_id="srv_db_prod_9012",
    api_key="sk-rfa-..."
)

# Example query verification
query = "SELECT * FROM users WHERE role = 'admin'"
is_allowed, reasoning = guardrail.verify(
    query=query,
    context={"user_id": "usr_789"}
)

if is_allowed:
    # Proceed to execute query safely
    print(f"Success: {reasoning}")
else:
    # Intercept agent action
    raise PermissionError(f"Guardrail Blocked Action: {reasoning}")`
  }

  return (
    <div className="px-6 lg:px-14 py-12 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/5 px-3 py-1 text-xs font-bold text-violet-300 mb-4">
          <span className="w-1.5 h-1.5 bg-violet-400 rounded-full" />
          Reference
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-white">Documentation</h1>
        <p className="text-slate-400 mt-2 text-base">
          Learn how to integrate Ralles guardrails and protect your databases from autonomous AI agent drift.
        </p>
      </div>

      <div className="h-px mb-10" style={{ background: 'linear-gradient(90deg,rgba(99,102,241,0.3),transparent)' }} />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
        {/* Sidebar */}
        <aside className="lg:col-span-1 sticky top-28 h-fit">
          <div className="rounded-2xl p-4" style={cardGlass}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3 px-2">Guides</p>
            <nav className="space-y-0.5">
              {sidebarLinks.map(link => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setActiveSection(link.href.replace('#', ''))}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all"
                  style={{
                    color: activeSection === link.href.replace('#', '') ? '#c4b5fd' : '#64748b',
                    background: activeSection === link.href.replace('#', '') ? 'rgba(124,58,237,0.12)' : 'transparent',
                  }}
                >
                  <span className="text-base">{link.icon}</span>
                  {link.label}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <main className="lg:col-span-3 space-y-16">
          {/* Introduction */}
          <motion.section
            id="introduction"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}
            className="space-y-5"
          >
            <h2 className="text-2xl font-bold text-white">Introduction</h2>
            <p className="text-slate-400 leading-relaxed">
              Ralles provides an intelligent reasoning firewall for autonomous AI agents that interact with structured databases. By converting your database schema and foreign key constraints into a <span className="text-violet-400 font-semibold">neurosymbolic association graph</span>, Ralles allows you to enforce strict guardrail rules that prevent agents from performing unsafe joins, unauthorized data mutation, or exposing sensitive database objects.
            </p>
            <div
              className="p-4 rounded-xl text-sm leading-relaxed"
              style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)' }}
            >
              <span className="font-bold text-violet-400 mr-1">How it works:</span>
              <span className="text-slate-300">When an AI agent generates a SQL query or intends to interact with a database, your application forwards the query to Ralles. Our logical inference engine runs reasoning over active database policies and evaluates whether the query complies with the semantic definitions of your schema.</span>
            </div>
          </motion.section>

          {/* Quickstart */}
          <motion.section
            id="quickstart"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}
            className="space-y-5"
          >
            <h2 className="text-2xl font-bold text-white">Quickstart</h2>
            <ol className="space-y-4">
              {[
                {
                  n: '01', title: 'Connect your Database',
                  body: <>Go to the <a href="/dashboard/servers" className="text-violet-400 hover:text-violet-300 font-medium underline underline-offset-2 transition-colors">Servers</a> tab, click &quot;+ Connect Database&quot;, and enter a secure connection string. Ralles will instantly extract the schema and generate business entity definitions.</>
                },
                {
                  n: '02', title: 'Generate an API Key',
                  body: <>Navigate inside your newly connected server&apos;s details page, go to the <span className="text-slate-200 font-medium">API &amp; Docs</span> tab, and click &quot;Generate New Key&quot;.</>
                },
                {
                  n: '03', title: 'Inject into your Code',
                  body: <>Use the endpoint <code className="text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded font-mono text-xs">https://api.ralles.com/v1/verify</code> to validate all SQL strings before executing them on your server.</>
                },
              ].map(step => (
                <li key={step.n} className="flex gap-4">
                  <div
                    className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black text-white"
                    style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}
                  >
                    {step.n}
                  </div>
                  <div className="pt-1">
                    <span className="font-semibold text-white">{step.title}: </span>
                    <span className="text-slate-400 leading-relaxed">{step.body}</span>
                  </div>
                </li>
              ))}
            </ol>
          </motion.section>

          {/* Custom LLM Providers */}
          <motion.section
            id="custom-llms"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="space-y-5"
          >
            <h2 className="text-2xl font-bold text-white">Custom LLM Providers</h2>
            <p className="text-slate-400 leading-relaxed">
              Bring your own keys to power parsing and extraction. Under the server <strong className="text-slate-300">Configuration</strong> tab, you can input your custom credentials to direct all NLP queries, policy extractions, and verdict comparisons to your own cloud endpoints.
            </p>
            <div className="space-y-3">
              {[
                { icon: '🟣', title: 'Google Gemini', body: <>Set custom Gemini keys to run parsing and logic generation directly via <code className="text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded font-mono text-xs">gemini-2.5-flash</code>.</> },
                { icon: '🟢', title: 'OpenAI Support', body: <>Choose OpenAI to delegate compliance checks and NLU parsing to <code className="text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded font-mono text-xs">gpt-4o-mini</code>.</> },
                { icon: '🔑', title: 'Masking & Security', body: <>API credentials are fully masked (<code className="text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded font-mono text-xs">sk-...••••</code>) upon retrieval to protect keys on the client browser.</> },
              ].map(item => (
                <div key={item.title} className="flex gap-3 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <span className="text-xl flex-shrink-0">{item.icon}</span>
                  <div><span className="font-semibold text-slate-200">{item.title}: </span><span className="text-slate-400 text-sm leading-relaxed">{item.body}</span></div>
                </div>
              ))}
            </div>
          </motion.section>

          {/* Dev & Sandbox */}
          <motion.section
            id="dev-databases"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
            className="space-y-5"
          >
            <h2 className="text-2xl font-bold text-white">Development &amp; Sandbox Databases</h2>
            <p className="text-slate-400 leading-relaxed">
              Ralles works identically whether you connect a local development database or a production database. When setting up a reasoning server, simply provide the connection string for your database. The schema introspection and extraction system parses table metadata structures in the same way regardless of the environment.
            </p>
          </motion.section>

          {/* API Reference */}
          <motion.section
            id="api-reference"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}
            className="space-y-5"
          >
            <h2 className="text-2xl font-bold text-white">API Reference</h2>
            <div className="rounded-2xl overflow-hidden" style={cardGlass}>
              <div style={{ height: 3, background: 'linear-gradient(90deg,#7c3aed,#6366f1,#0ea5e9)' }} />
              <div className="p-6 space-y-5">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg text-white" style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>POST</span>
                  <code className="text-slate-200 font-mono font-bold">/v1/verify</code>
                </div>
                <p className="text-slate-400 text-sm">Verify whether a query complies with the server&apos;s neurosymbolic guardrail rules.</p>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">cURL Request Example</p>
                    <button
                      onClick={() => copyToClipboard(codeBlocks.curl, 'curl')}
                      className="text-xs font-semibold text-violet-400 hover:text-violet-300 transition-colors px-3 py-1 rounded-lg hover:bg-violet-500/10"
                    >
                      {copiedText === 'curl' ? '✓ Copied!' : 'Copy'}
                    </button>
                  </div>
                  <pre style={codeBlockStyle}><code>{codeBlocks.curl}</code></pre>
                </div>
              </div>
            </div>
          </motion.section>

          {/* SDK Examples */}
          <motion.section
            id="sdk-examples"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
            className="space-y-5"
          >
            <h2 className="text-2xl font-bold text-white">SDK &amp; Framework Examples</h2>
            <div className="rounded-2xl overflow-hidden" style={cardGlass}>
              <div style={{ height: 3, background: 'linear-gradient(90deg,#6366f1,#0ea5e9)' }} />
              <div className="p-6 space-y-4">
                <div>
                  <h3 className="text-base font-bold text-white">Python / LangChain Integration</h3>
                  <p className="text-slate-400 text-sm mt-1">Integrate Ralles directly as a validation middleware in LangChain.</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Python Middleware Example</p>
                  <button
                    onClick={() => copyToClipboard(codeBlocks.langchain, 'python')}
                    className="text-xs font-semibold text-violet-400 hover:text-violet-300 transition-colors px-3 py-1 rounded-lg hover:bg-violet-500/10"
                  >
                    {copiedText === 'python' ? '✓ Copied!' : 'Copy'}
                  </button>
                </div>
                <pre style={codeBlockStyle}><code>{codeBlocks.langchain}</code></pre>
              </div>
            </div>
          </motion.section>

          {/* Privacy Policy */}
          <motion.section
            id="privacy-policy"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="space-y-5 pb-16"
          >
            <h2 className="text-2xl font-bold text-white">Privacy &amp; Credentials Policy</h2>
            <p className="text-slate-400 leading-relaxed">We care deeply about safety, trust, and the confidentiality of your database configurations.</p>
            <div className="space-y-4">
              {[
                {
                  n: '1', title: 'Read-Only Database Schema Introspection',
                  body: 'When you connect a production or development database string, Ralles initiates a read-only metadata transaction to reflect table definitions, primary keys, and foreign keys. We never copy, store, or cache row data or query responses.',
                },
                {
                  n: '2', title: 'Key Encryption & Masking',
                  body: 'All custom API keys (Google Gemini, OpenAI) provided for reasoning workflows are stored encrypted. When requested by user-facing dashboards, the backend masks keys completely (e.g. keeping only the prefix) to prevent raw credentials from being exposed in browser logs.',
                },
                {
                  n: '3', title: 'Audit Trails',
                  body: 'API logs are stored strictly for audit visibility under your account. You can clear request history and disconnect connected servers at any time, which automatically cascade-deletes all associated schemas, text policies, and log trails.',
                },
              ].map(item => (
                <div key={item.n} className="p-5 rounded-xl space-y-1.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <h4 className="font-bold text-slate-200">{item.n}. {item.title}</h4>
                  <p className="text-slate-400 text-sm leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </motion.section>
        </main>
      </div>
    </div>
  )
}
