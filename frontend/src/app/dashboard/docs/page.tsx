'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'

export default function DocsPage() {
  const [copiedText, setCopiedText] = useState<string | null>(null)

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedText(id)
    setTimeout(() => setCopiedText(null), 2000)
  }

  const codeBlocks = {
    curl: `curl -X POST https://api.reasonsforall.com/v1/verify \\
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
from reasons_for_all import ReasonsGuardrail

# Initialize the ReasonsForALL logical guardrail
guardrail = ReasonsGuardrail(
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
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight">Documentation</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Learn how to integrate ReasonsForALL logical guardrails and protect your databases from autonomous AI agent drift.
        </p>
      </div>

      <Separator className="bg-border/50" />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <aside className="lg:col-span-1 space-y-2 sticky top-24 h-fit">
          <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground px-2">Guides</h3>
          <a href="#introduction" className="block px-2 py-1.5 text-sm font-medium rounded-md hover:bg-muted/50 text-foreground transition-colors">Introduction</a>
          <a href="#quickstart" className="block px-2 py-1.5 text-sm font-medium rounded-md hover:bg-muted/50 text-foreground transition-colors">Quickstart</a>
          <a href="#api-reference" className="block px-2 py-1.5 text-sm font-medium rounded-md hover:bg-muted/50 text-foreground transition-colors">API Reference</a>
          <a href="#sdk-examples" className="block px-2 py-1.5 text-sm font-medium rounded-md hover:bg-muted/50 text-foreground transition-colors">SDK & Frameworks</a>
        </aside>

        <main className="lg:col-span-3 space-y-12">
          {/* Introduction */}
          <section id="introduction" className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight">Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              ReasonsForALL provides an intelligent reasoning firewall for autonomous AI agents that interact with structured databases. By converting your database schema and foreign key constraints into a semantic description logics (TBox) framework, ReasonsForALL allows you to enforce strict guardrail rules that prevent agents from performing unsafe joins, unauthorized data mutation, or exposing sensitive database objects.
            </p>
            <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 text-sm leading-relaxed">
              <span className="font-bold text-primary mr-1">How it works:</span> 
              When an AI agent generates a SQL query or intents to interact with a database, your application forwards the query to ReasonsForALL. Our logical inference engine runs reasoning over active database policies and evaluates whether the query complies with the semantic definitions of your schema.
            </div>
          </section>

          {/* Quickstart */}
          <section id="quickstart" className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight">Quickstart</h2>
            <ol className="space-y-4 list-decimal pl-5 text-muted-foreground leading-relaxed">
              <li>
                <span className="font-semibold text-foreground">Connect your Database:</span> Go to the <a href="/dashboard/servers" className="text-primary hover:underline font-medium">Servers</a> tab, click "+ Connect Database", and enter a secure connection string. ReasonsForALL will instantly extract the schema and generate business entity definitions.
              </li>
              <li>
                <span className="font-semibold text-foreground">Generate an API Key:</span> Navigate inside your newly connected server's details page, go to the <span className="font-medium text-foreground">API & Docs</span> tab, and click "Generate New Key".
              </li>
              <li>
                <span className="font-semibold text-foreground">Inject into your Code:</span> Use the endpoint <code className="bg-muted px-1 py-0.5 rounded text-primary">https://api.reasonsforall.com/v1/verify</code> to validate all SQL strings before executing them on your server.
              </li>
            </ol>
          </section>

          {/* API Reference */}
          <section id="api-reference" className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight">API Reference</h2>
            <Card className="border-border/50 shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <span className="bg-primary text-white text-xs font-bold px-2 py-1 rounded">POST</span>
                  <CardTitle className="text-base font-mono">/v1/verify</CardTitle>
                </div>
                <CardDescription>Verify whether a query complies with the server's semantic guardrail rules.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Request Headers</h4>
                  <div className="bg-muted/50 p-3 rounded-lg border border-border/40 font-mono text-sm space-y-1">
                    <div><span className="text-primary">Authorization:</span> Bearer sk-rfa-...</div>
                    <div><span className="text-primary">Content-Type:</span> application/json</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">cURL Request Example</h4>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => copyToClipboard(codeBlocks.curl, 'curl')}
                      className="text-xs text-primary hover:bg-primary/5"
                    >
                      {copiedText === 'curl' ? 'Copied!' : 'Copy Code'}
                    </Button>
                  </div>
                  <pre className="p-4 rounded-xl bg-zinc-950 text-zinc-50 overflow-x-auto text-sm border border-border/50 font-mono leading-relaxed">
                    <code>{codeBlocks.curl}</code>
                  </pre>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* SDK Examples */}
          <section id="sdk-examples" className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight">SDK & Framework Examples</h2>
            
            <Card className="border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Python / LangChain Integration</CardTitle>
                <CardDescription>Integrate ReasonsForALL directly as a validation middleware in LangChain.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Python Middleware Example</h4>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => copyToClipboard(codeBlocks.langchain, 'python')}
                    className="text-xs text-primary hover:bg-primary/5"
                  >
                    {copiedText === 'python' ? 'Copied!' : 'Copy Code'}
                  </Button>
                </div>
                <pre className="p-4 rounded-xl bg-zinc-950 text-zinc-50 overflow-x-auto text-sm border border-border/50 font-mono leading-relaxed">
                  <code>{codeBlocks.langchain}</code>
                </pre>
              </CardContent>
            </Card>
          </section>
        </main>
      </div>
    </div>
  )
}
