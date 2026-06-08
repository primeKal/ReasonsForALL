'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'

export default function ServerDetailsPage({ params }: { params: any }) {
  const resolvedParams = params && typeof params.then === 'function' ? use(params) : params
  const id = resolvedParams?.id
  const [activeTab, setActiveTab] = useState('overview')
  const [server, setServer] = useState<any>(null)
  const [concepts, setConcepts] = useState<any[]>([])
  const [rules, setRules] = useState<any[]>([])
  const [textPolicies, setTextPolicies] = useState<any[]>([])
  const [rulesSubTab, setRulesSubTab] = useState<'logical' | 'text'>('text')
  const [apiKeys, setApiKeys] = useState<any[]>([])
  const [apiLogs, setApiLogs] = useState<any[]>([])
  const [expandedLogs, setExpandedLogs] = useState<Record<number, boolean>>({})
  const [copiedEndpoint, setCopiedEndpoint] = useState(false)
  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({})
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null)
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [reasoningMode, setReasoningMode] = useState<'text' | 'logical'>('text')
  const [expandedAnalysis, setExpandedAnalysis] = useState<Record<number, boolean>>({})
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    if (server) {
      const isLogical = reasoningMode === 'logical'
      setChatMessages([
        {
          sender: 'assistant',
          text: isLogical
            ? `Hello! I am **Ralles**, your reasoning assistant for **${server.name}**.\n\nI am running in **Logical Reasoning Mode (Beta)**. I will perform formal neurosymbolic description-logic inference on your assertions.\n\nType a logical statement below (e.g. classes, subclasses, or relations) to evaluate consistency.`
            : `Hello! I am **Ralles**, your reasoning assistant for **${server.name}**.\n\nI am running in **Text Policy Mode** (default). I will compare your queries against natural-language business policies extracted from your database schema.\n\nAsk a policy query below.`,
          example: isLogical
            ? (server.example_statement || "Waiter subClassOf Employee")
            : "Can an anonymous user delete a rating?"
        }
      ])
    }
  }, [server, reasoningMode])

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim() || chatLoading) return

    const userText = chatInput.trim()
    setChatInput('')
    setChatMessages((prev) => [...prev, { sender: 'user', text: userText }])
    setChatLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/server/${id}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ message: userText, reasoning_mode: reasoningMode })
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.detail || 'Reasoning request failed')
      }
      const data = await res.json()
      
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: data.explanation || 'No explanation returned.',
          isValid: data.is_valid,
          violations: data.violations || [],
          analysis: data.analysis || null,
          reasoning_mode: data.reasoning_mode || reasoningMode,
        }
      ])
    } catch (err: any) {
      console.error(err)
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: `❌ Error: ${err.message || 'Could not reach the reasoning engine API.'}`,
          isValid: false,
          violations: []
        }
      ])
    } finally {
      setChatLoading(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect this database?')) return
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    
    await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/server/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    })
    
    router.push('/dashboard/servers')
  }

  const handleGenerateKey = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/server/${id}/api_keys`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    })
    
    if (res.ok) {
      const newKey = await res.json()
      setApiKeys([...apiKeys, newKey])
    }
  }

  useEffect(() => {
    async function loadData() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const headers = { 'Authorization': `Bearer ${session.access_token}` }
      const baseUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL}/server/${id}`
      
      try {
        const [serverRes, conceptsRes, rulesRes, policiesRes, logsRes, keysRes] = await Promise.all([
          fetch(baseUrl, { headers }),
          fetch(`${baseUrl}/concepts`, { headers }),
          fetch(`${baseUrl}/rules`, { headers }),
          fetch(`${baseUrl}/text_policies`, { headers }),
          fetch(`${baseUrl}/api_logs`, { headers }),
          fetch(`${baseUrl}/api_keys`, { headers })
        ])

        if (serverRes.ok) setServer(await serverRes.json())
        if (conceptsRes.ok) {
           const data = await conceptsRes.json()
           setConcepts(data.entities || [])
        }
        if (rulesRes.ok) {
           const data = await rulesRes.json()
           setRules(data.rules || [])
        }
        if (policiesRes.ok) {
           const data = await policiesRes.json()
           setTextPolicies(data.policies || [])
        }
        if (logsRes.ok) {
           const data = await logsRes.json()
           setApiLogs(data.logs || [])
        }
        if (keysRes.ok) {
           setApiKeys(await keysRes.json())
        }
      } catch(e) {
        console.error(e)
      }
    }
    if (id) loadData()
  }, [id])

  if (!server) return <div className="p-8 text-center text-muted-foreground mt-12 font-medium">Loading server configuration...</div>

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'concepts', label: 'Business Entities' },
    { id: 'rules', label: 'Guardrail Rules' },
    { id: 'api_logs', label: 'API Logs' },
    { id: 'api', label: 'API & Docs' },
    { id: 'config', label: 'Configuration' }
  ]

  return (
    <div className="p-8 max-w-6xl mx-auto mt-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3">
            {server.name} 
            <span className="text-xs bg-green-500/10 text-green-500 px-2 py-1 rounded-full border border-green-500/20 uppercase">{server.status}</span>
          </h1>
          <p className="text-muted-foreground mt-1">ID: {id}</p>
        </div>
        <Button onClick={handleDisconnect} variant="outline" className="border-red-500/20 text-red-500 hover:bg-red-500/10">Disconnect Server</Button>
      </div>

      <div className="flex border-b border-border/50 mb-8 overflow-x-auto hide-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative px-6 py-3 font-medium text-sm whitespace-nowrap transition-colors ${activeTab === tab.id ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {activeTab === tab.id && (
              <motion.div layoutId="underline" initial={false} className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-primary/5 border-primary/20">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Active Policies</CardTitle></CardHeader>
                  <CardContent><div className="text-4xl font-bold">{server.active_policies_count} <span className="text-sm font-normal text-muted-foreground">/ {server.active_policies_limit} Limit</span></div></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Inference Time (Avg)</CardTitle></CardHeader>
                  <CardContent><div className="text-4xl font-bold">{server.avg_inference_time_ms}<span className="text-sm font-normal text-muted-foreground">ms</span></div></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Recent Blocks</CardTitle></CardHeader>
                  <CardContent><div className="text-4xl font-bold text-red-400">{server.recent_blocks}</div></CardContent>
                </Card>
              </div>

              {/* Policy Chat Interface */}
              <Card className="border-primary/20 shadow-lg relative overflow-hidden bg-card">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-blue-500 to-indigo-500"></div>
                <CardHeader className="pb-3 border-b border-border/40">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-xl font-bold text-foreground">
                        <span>💬</span> Ralles Reasoning Assistant
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {reasoningMode === 'text'
                          ? 'Text Policy Mode — queries are evaluated against extracted business policies using neurosymbolic analysis.'
                          : 'Logical Reasoning Mode (Beta) — formal description-logic inference using Ralles reasoning engine.'}
                      </CardDescription>
                    </div>
                    {/* Reasoning Mode Toggle */}
                    <div className="flex items-center gap-1.5 bg-muted/60 border border-border/50 rounded-xl p-1 flex-shrink-0">
                      <button
                        id="mode-toggle-text"
                        onClick={() => setReasoningMode('text')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          reasoningMode === 'text'
                            ? 'bg-primary text-white shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        📋 Text Policies
                      </button>
                      <button
                        id="mode-toggle-logical"
                        onClick={() => setReasoningMode('logical')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                          reasoningMode === 'logical'
                            ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        🧪 Logical <span className="text-[10px] opacity-80">Beta</span>
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="h-[380px] overflow-y-auto rounded-xl border border-border/50 bg-muted/10 p-4 space-y-4 flex flex-col justify-between">
                    <div className="space-y-4 overflow-y-auto pr-1 flex-1">
                      {chatMessages.map((msg, index) => (
                        <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] rounded-2xl p-4 text-sm shadow-sm leading-relaxed ${
                            msg.sender === 'user' 
                              ? 'bg-primary text-white font-medium rounded-tr-none' 
                              : 'bg-card border border-border/50 text-foreground rounded-tl-none space-y-3'
                          }`}>
                            {/* Message text */}
                            <div className="whitespace-pre-wrap">{msg.text}</div>
                            
                            {/* AI suggested rule placeholder (Intro Message Only) */}
                            {msg.example && (
                              <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 text-xs mt-2 text-muted-foreground">
                                <span className="font-semibold text-primary block mb-1">💡 Suggested AI Rule Placeholder:</span>
                                <span className="italic">"{msg.example}"</span>
                                <button 
                                  onClick={() => setChatInput(msg.example)}
                                  className="block text-primary hover:underline font-bold mt-2 text-left"
                                >
                                  👉 Click to paste statement into chat
                                </button>
                              </div>
                            )}

                            {/* Status validation badge + Analysis tab for assistant replies */}
                            {msg.sender === 'assistant' && msg.isValid !== undefined && (
                              <div className="mt-2 flex flex-col gap-2 pt-2 border-t border-border/40">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-semibold text-muted-foreground">Status:</span>
                                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${msg.isValid ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                    {msg.isValid ? '✓ Permitted' : '✗ Blocked'}
                                  </span>
                                  {msg.analysis?.confidence !== undefined && (
                                    <span className="px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">
                                      Confidence: {Math.round(msg.analysis.confidence * 100)}%
                                    </span>
                                  )}
                                  {msg.reasoning_mode && (
                                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                      msg.reasoning_mode === 'logical'
                                        ? 'bg-violet-500/10 text-violet-400'
                                        : 'bg-blue-500/10 text-blue-400'
                                    }`}>
                                      {msg.reasoning_mode === 'logical' ? '🧪 Logical' : '📋 Text'}
                                    </span>
                                  )}
                                </div>

                                {/* Violations */}
                                {msg.violations && msg.violations.length > 0 && (
                                  <div className="p-3 bg-red-500/5 rounded-lg border border-red-500/20 text-xs text-red-400 space-y-1">
                                    <span className="font-bold block">❌ Violated Policies:</span>
                                    {msg.violations.map((v: string, i: number) => (
                                      <div key={i} className="flex gap-1.5 items-start"><span>•</span><span>{v}</span></div>
                                    ))}
                                  </div>
                                )}

                                {/* Analysis accordion */}
                                {msg.analysis && (
                                  <div className="mt-1">
                                    <button
                                      onClick={() => setExpandedAnalysis(prev => ({ ...prev, [index]: !prev[index] }))}
                                      className="flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline"
                                    >
                                      {expandedAnalysis[index] ? '▾' : '▸'} Analysis
                                      {msg.analysis.policies_checked ? ` (${msg.analysis.policies_checked} policies checked)` : ''}
                                    </button>
                                    {expandedAnalysis[index] && (
                                      <div className="mt-2 rounded-lg border border-border/50 bg-muted/30 p-3 space-y-3 text-xs">
                                        {/* Summary */}
                                        {msg.analysis.summary && (
                                          <p className="text-muted-foreground italic">{msg.analysis.summary}</p>
                                        )}
                                        {/* Supporting policies */}
                                        {msg.analysis.supporting_policies?.length > 0 && (
                                          <div>
                                            <span className="font-semibold text-green-500 block mb-1">✅ Supporting Policies:</span>
                                            {msg.analysis.supporting_policies.map((p: string, i: number) => (
                                              <div key={i} className="flex gap-1.5"><span>•</span><span>{p}</span></div>
                                            ))}
                                          </div>
                                        )}
                                        {/* Violated policies */}
                                        {msg.analysis.violated_policies?.length > 0 && (
                                          <div>
                                            <span className="font-semibold text-red-400 block mb-1">❌ Violated Policies:</span>
                                            {msg.analysis.violated_policies.map((p: string, i: number) => (
                                              <div key={i} className="flex gap-1.5"><span>•</span><span>{p}</span></div>
                                            ))}
                                          </div>
                                        )}
                                        {/* Reasoning steps */}
                                        {msg.analysis.analysis_steps?.length > 0 && (
                                          <div>
                                            <span className="font-semibold text-foreground block mb-1">🔍 Reasoning Steps:</span>
                                            {msg.analysis.analysis_steps.map((s: string, i: number) => (
                                              <div key={i} className="flex gap-1.5 text-muted-foreground">
                                                <span className="text-primary font-bold flex-shrink-0">{i+1}.</span>
                                                <span>{s}</span>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                        {/* DL specifics for logical mode */}
                                        {msg.analysis.generated_dl_statement && (
                                          <div>
                                            <span className="font-semibold text-violet-400 block mb-1">DL Formula:</span>
                                            <code className="bg-muted px-2 py-1 rounded text-violet-300">{msg.analysis.generated_dl_statement}</code>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}

                      {chatLoading && (
                        <div className="flex justify-start">
                          <div className="max-w-[80%] rounded-2xl rounded-tl-none p-4 bg-card border border-border/50 text-foreground text-sm flex items-center gap-3">
                            <span className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce"></span>
                            <span className="text-muted-foreground text-xs font-medium">AI Reasoner is thinking...</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <form onSubmit={handleSendChatMessage} className="flex gap-2">
                    <Input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder={reasoningMode === 'text' ? 'Ask a policy question (e.g. can a user create a rating?)' : 'Enter a logical statement (e.g. can a Waiter place an order?)'}
                      disabled={chatLoading}
                      className="flex-1 bg-card border-border/60 text-sm h-11"
                    />
                    <Button type="submit" disabled={chatLoading || !chatInput.trim()} className="text-white h-11 px-5 shadow-md">
                      {reasoningMode === 'text' ? 'Check Policy' : 'Evaluate Logic'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'concepts' && (
            <Card>
              <CardHeader>
                <CardTitle>Business Entities</CardTitle>
                <CardDescription>The core business objects intelligently mapped from your database.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {concepts.length === 0 ? <p className="text-muted-foreground text-sm">No entities extracted yet.</p> : null}
                  {concepts.map(concept => (
                    <div key={concept.name} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-md bg-blue-500/10 flex items-center justify-center text-blue-500 font-bold">C</div>
                        <span className="font-semibold">{concept.name}</span>
                      </div>
                      <span className="text-xs bg-muted px-2 py-1 rounded">{concept.status}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'rules' && (
            <Card>
              <CardHeader className="pb-3 border-b border-border/40">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <CardTitle>Guardrail Rules & Policies</CardTitle>
                    <CardDescription>
                      {rulesSubTab === 'text'
                        ? 'Natural language business policies extracted from triggers, functions, and database schema.'
                        : 'Formal Description Logic constraints mapped from database keys and hierarchies.'}
                    </CardDescription>
                  </div>
                  
                  {/* Rules Sub-Tab Toggle */}
                  <div className="flex items-center gap-1.5 bg-muted/60 border border-border/50 rounded-xl p-1 flex-shrink-0">
                    <button
                      onClick={() => setRulesSubTab('text')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        rulesSubTab === 'text'
                          ? 'bg-primary text-white shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      📋 Text Policies ({textPolicies.length})
                    </button>
                    <button
                      onClick={() => setRulesSubTab('logical')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                        rulesSubTab === 'logical'
                          ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      🧪 Logical Rules ({rules.length})
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {rulesSubTab === 'text' ? (
                  <div className="space-y-4">
                    {textPolicies.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground border border-dashed border-border/45 rounded-xl bg-muted/5">
                        No text-based business policies extracted for this server. 
                        <br />
                        <span className="text-xs text-muted-foreground/80 mt-1 block">
                          Tip: Use triggers or functions in your schema, or sync to automatically extract policies.
                        </span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4">
                        {textPolicies.map((policy) => (
                          <div
                            key={policy.id || policy.title}
                            className="p-5 rounded-xl border border-border/50 bg-card hover:border-primary/30 transition-all shadow-sm hover:shadow-md relative overflow-hidden"
                          >
                            {/* Accent line based on source_type */}
                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                              policy.source_type === 'trigger'
                                ? 'bg-orange-500'
                                : policy.source_type === 'function'
                                ? 'bg-indigo-500'
                                : 'bg-blue-500'
                            }`} />
                            
                            <div className="pl-2">
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="font-bold text-foreground text-base">{policy.title}</h3>
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                  policy.source_type === 'trigger'
                                    ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                                    : policy.source_type === 'function'
                                    ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                                    : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                }`}>
                                  {policy.source_type}
                                </span>
                              </div>
                              <p className="text-muted-foreground text-sm leading-relaxed">{policy.body}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="rounded-md border border-border/50 overflow-hidden overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-muted text-muted-foreground">
                          <tr>
                            <th className="px-4 py-3">Entity</th>
                            <th className="px-4 py-3">Relationship</th>
                            <th className="px-4 py-3">Target</th>
                            <th className="px-4 py-3">Quantifier</th>
                            <th className="px-4 py-3">Type</th>
                            <th className="px-4 py-3">Description Logic / Axiom</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                          {rules.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No active rules</td></tr> : null}
                          {rules.map((rule, idx) => (
                            <tr key={idx} className="hover:bg-muted/10 transition-colors">
                              <td className="px-4 py-3 font-medium">{rule.subject}</td>
                              <td className="px-4 py-3 text-primary">{rule.predicate}</td>
                              <td className="px-4 py-3">{rule.object}</td>
                              <td className="px-4 py-3">
                                {rule.quantifier && rule.quantifier !== 'none' ? (
                                  <span className="px-2 py-0.5 rounded text-xs bg-blue-500/10 text-blue-500 font-bold capitalize">
                                    {rule.quantifier} {rule.cardinality_value !== undefined && rule.cardinality_value !== null ? `(${rule.cardinality_value})` : ''}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground text-xs">—</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                  rule.type === 'Relationship' || rule.type === 'ObjectProperty' 
                                    ? 'bg-yellow-500/10 text-yellow-500' 
                                    : rule.type === 'ClassHierarchy'
                                    ? 'bg-emerald-500/10 text-emerald-500'
                                    : 'bg-purple-500/10 text-purple-500'
                                }`}>
                                  {rule.type}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-muted-foreground text-xs max-w-[280px] truncate" title={rule.description}>
                                {rule.description || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {rules.length >= 1000 && (
                      <div className="mt-4 p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                        <p className="text-sm text-orange-500 font-medium">⚠️ Free Trial Constraint: You have reached the maximum of 1000 active rules. Agents attempting complex multi-table joins will bypass validation.</p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === 'api_logs' && (
            <Card className="border-border/50 shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/40">
                <div>
                  <CardTitle>API Verification Logs</CardTitle>
                  <CardDescription>Real-time audit trail of all /verify API requests evaluated by this server.</CardDescription>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={async () => {
                    const { data: { session } } = await supabase.auth.getSession()
                    if (session) {
                      const headers = { 'Authorization': `Bearer ${session.access_token}` }
                      const logsRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/server/${id}/api_logs`, { headers })
                      if (logsRes.ok) {
                        const data = await logsRes.json()
                        setApiLogs(data.logs || [])
                      }
                    }
                  }}
                  className="flex items-center gap-1.5"
                >
                  🔄 Refresh Logs
                </Button>
              </CardHeader>
              <CardContent className="pt-6">
                {apiLogs.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground border border-dashed border-border/45 rounded-xl bg-muted/5">
                    No verification API calls recorded yet.
                    <br />
                    <span className="text-xs text-muted-foreground/80 mt-1 block">
                      Tip: Deploy agent keys and call POST /reasoning/verify to see real-time guardrail logs.
                    </span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {apiLogs.map((log, idx) => (
                      <div 
                        key={log.id || idx}
                        className="rounded-xl border border-border/50 bg-card overflow-hidden transition-all shadow-sm hover:shadow-md"
                      >
                        {/* Summary Header Row */}
                        <div className="p-4 flex items-center justify-between gap-4 flex-wrap bg-muted/10 border-b border-border/30">
                          <div className="flex items-center gap-3">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${log.is_valid ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                              {log.is_valid ? '✓ PASS' : '✗ BLOCKED'}
                            </span>
                            <span className="font-mono text-sm font-semibold bg-muted px-2 py-0.5 rounded text-foreground">
                              {log.agent_intent}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>⏱️ {log.inference_time_ms.toFixed(1)}ms</span>
                            <span>📅 {new Date(log.created_at).toLocaleString()}</span>
                            <button
                              onClick={() => setExpandedLogs(prev => ({ ...prev, [idx]: !prev[idx] }))}
                              className="text-primary font-bold hover:underline flex items-center gap-1 ml-2"
                            >
                              {expandedLogs[idx] ? 'Hide Analysis ▾' : 'View Analysis ▸'}
                            </button>
                          </div>
                        </div>

                        {/* Collapsible Detail Panel */}
                        {expandedLogs[idx] && (
                          <div className="p-5 bg-card space-y-4 text-sm border-t border-border/30 animate-fadeIn">
                            {/* Violations */}
                            {!log.is_valid && log.violations && log.violations.length > 0 && (
                              <div className="p-3 bg-red-500/5 rounded-lg border border-red-500/20 text-xs text-red-400 space-y-1">
                                <span className="font-bold block">❌ Violated Constraints:</span>
                                {log.violations.map((v: string, i: number) => (
                                  <div key={i} className="flex gap-1.5 items-start"><span>•</span><span>{v}</span></div>
                                ))}
                              </div>
                            )}

                            {/* Request Payload */}
                            <div className="space-y-1.5">
                              <span className="text-xs font-bold text-muted-foreground block">📥 Input Payload:</span>
                              <pre className="bg-zinc-950 text-zinc-50 p-4 rounded-lg font-mono text-xs overflow-x-auto border border-border/40">
                                {JSON.stringify(log.payload, null, 2)}
                              </pre>
                            </div>

                            {/* Verification verdict */}
                            <div className="p-3.5 rounded-lg border border-border/40 bg-muted/30 text-xs space-y-1">
                              <span className="font-bold text-foreground block">🔍 Decision Inference:</span>
                              <p className="text-muted-foreground">
                                {log.is_valid 
                                  ? 'The reasoning engine successfully verified this request payload. No disjointness barriers or policy contradictions were encountered.'
                                  : `This payload violated logical guardrail rules. Prohibited concepts: ${log.violations.join(', ')}.`
                                }
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === 'api' && (
            <div className="space-y-6">
              <Card className="border-border/50 shadow-md">
                <CardHeader>
                  <CardTitle>API Access</CardTitle>
                  <CardDescription>Generate keys to inject into your LangChain or Autogen agents.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label className="font-semibold text-foreground">Server Endpoint</Label>
                    <div className="flex gap-2">
                      <Input readOnly value="https://api.ralles.com/v1/verify" className="font-mono text-sm bg-muted/50 border-border/60" />
                      <Button 
                        variant="secondary"
                        onClick={() => {
                          navigator.clipboard.writeText("https://api.ralles.com/v1/verify")
                          setCopiedEndpoint(true)
                          setTimeout(() => setCopiedEndpoint(false), 2000)
                        }}
                        className="transition-all"
                      >
                        {copiedEndpoint ? 'Copied!' : 'Copy'}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label className="font-semibold text-foreground">Secret Agent Keys</Label>
                      <Button onClick={handleGenerateKey} size="sm" className="text-white shadow-sm transition-all">+ Generate New Key</Button>
                    </div>
                    {apiKeys.length === 0 ? (
                      <div className="p-6 text-center rounded-lg border border-dashed border-border/40 bg-muted/20 text-sm text-muted-foreground">
                        No keys generated yet. Click "+ Generate New Key" to create a secret token for your AI agent.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {apiKeys.map(keyObj => (
                          <div key={keyObj.id} className="flex gap-2 items-center">
                            <Input 
                              type={revealedKeys[keyObj.id] ? 'text' : 'password'} 
                              readOnly 
                              value={keyObj.key} 
                              className="font-mono text-sm bg-muted/50 border-border/60" 
                            />
                            <Button 
                              variant="secondary"
                              onClick={() => setRevealedKeys(prev => ({ ...prev, [keyObj.id]: !prev[keyObj.id] }))}
                              className="w-20"
                            >
                              {revealedKeys[keyObj.id] ? 'Hide' : 'Reveal'}
                            </Button>
                            <Button 
                              variant="outline"
                              onClick={() => {
                                navigator.clipboard.writeText(keyObj.key)
                                setCopiedKeyId(keyObj.id)
                                setTimeout(() => setCopiedKeyId(null), 2000)
                              }}
                              className="w-20 border-border/60"
                            >
                              {copiedKeyId === keyObj.id ? 'Copied!' : 'Copy'}
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>API Documentation: /verify</CardTitle>
                  <CardDescription>Comprehensive guide on integrating the verification engine into your Agent workflows.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="aspect-video w-full rounded-md overflow-hidden border border-border/50 shadow-sm">
                    <iframe 
                      width="100%" 
                      height="100%" 
                      src="https://www.youtube.com/embed/dQw4w9WgXcQ" 
                      title="Ralles Integration Demo" 
                      frameBorder="0" 
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                      allowFullScreen
                    ></iframe>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Endpoint URL</h3>
                    <div className="bg-muted p-3 rounded-md font-mono text-sm text-primary">POST https://api.ralles.com/v1/verify</div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold mb-2">Request Headers</h3>
                    <div className="bg-muted p-3 rounded-md font-mono text-sm space-y-1">
                      <div><span className="text-muted-foreground">Authorization:</span> Bearer sk-rfa-...</div>
                      <div><span className="text-muted-foreground">Content-Type:</span> application/json</div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold mb-2">Payload Example (JSON)</h3>
                    <pre className="bg-zinc-950 text-zinc-50 p-4 rounded-md font-mono text-sm overflow-x-auto">
{`{
  "server_id": "${id}",
  "agent_query": "SELECT * FROM users WHERE role = 'admin'",
  "context": {
    "user_id": "123",
    "session_id": "abc"
  }
}`}
                    </pre>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold mb-2">Response Example</h3>
                    <pre className="bg-zinc-950 text-green-400 p-4 rounded-md font-mono text-sm overflow-x-auto">
{`{
  "status": "allowed",
  "reasoning": "Query complies with active guardrail rules. Access to 'admin' role is permitted for user_id '123'.",
  "execution_time_ms": 3.2
}`}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'config' && (
            <Card>
              <CardHeader>
                <CardTitle>Guardrail Configuration</CardTitle>
                <CardDescription>Adjust inference strictness and connection limits.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                 <div className="space-y-2">
                  <Label>Validation Mode</Label>
                  <select className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                    <option>Strict (Block all unknown queries)</option>
                    <option>Lenient (Warn only)</option>
                    <option disabled>Virtual Fetch (Premium Only)</option>
                  </select>
                </div>
                <Button variant="outline">Force Schema Resync</Button>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
