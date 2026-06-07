import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground selection:bg-primary/30">
      <header className="px-6 lg:px-14 h-20 flex items-center justify-between border-b border-border/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center font-bold text-white shadow-lg">R</div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">ReasonsForALL</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 font-medium text-sm text-muted-foreground">
          <Link href="#features" className="hover:text-primary transition-colors">Features</Link>
          <Link href="#how-it-works" className="hover:text-primary transition-colors">How it Works</Link>
          <Link href="#pricing" className="hover:text-primary transition-colors">Pricing</Link>
        </nav>
        <nav className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium hover:text-primary transition-colors hidden sm:block">Sign In</Link>
          <Link href="/login">
            <Button className="rounded-full px-6 shadow-md hover:shadow-lg transition-all text-white">Get Started</Button>
          </Link>
        </nav>
      </header>
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 text-center pt-32 pb-24 relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/20 blur-[100px] rounded-full -z-10 pointer-events-none"></div>
          <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary mb-8 backdrop-blur-sm">
            <span>🚀 The Ultimate Logical Firewall</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl mx-auto mb-8 text-balance">
            Turn unpredictable agents into <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">deterministic</span> decision-makers.
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            ReasonsForALL intercepts AI agent intents and validates them against an explicit knowledge base extracted directly from your relational databases.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center w-full max-w-md mx-auto sm:max-w-none">
            <Link href="/login">
              <Button size="lg" className="rounded-full px-8 h-12 text-base shadow-xl hover:-translate-y-1 transition-all text-white w-full sm:w-auto">Start 30-Day Free Trial</Button>
            </Link>
            <Link href="/dashboard/servers">
              <Button size="lg" variant="outline" className="rounded-full px-8 h-12 text-base backdrop-blur-md bg-background/50 hover:bg-muted/50 transition-all border-primary/20 hover:border-primary/50 w-full sm:w-auto">Enter Dashboard</Button>
            </Link>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 bg-muted/30 px-6 lg:px-14">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">The Logical Firewall for AI</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-lg">Prevent "hallu-relation" by ensuring your AI agents only generate valid queries according to your corporate schema rules.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <Card className="border-border/50 shadow-lg bg-background/60 backdrop-blur-sm">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-blue-500/10 flex items-center justify-center text-2xl mb-4">🛡️</div>
                  <CardTitle>Zero Hallucinations</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Catch impossible data requests before they hit your database. We validate subject-predicate relationships in sub-milliseconds.</p>
                </CardContent>
              </Card>
              <Card className="border-border/50 shadow-lg bg-background/60 backdrop-blur-sm">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-blue-500/10 flex items-center justify-center text-2xl mb-4">⚡</div>
                  <CardTitle>Stateless Quad-Store</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Never cache raw records. Our hybrid semantic architecture extracts your schema blueprint and tests agent parameters in isolated memory.</p>
                </CardContent>
              </Card>
              <Card className="border-border/50 shadow-lg bg-background/60 backdrop-blur-sm">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-blue-500/10 flex items-center justify-center text-2xl mb-4">🔌</div>
                  <CardTitle>Multi-Dialect Support</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Seamlessly hook into PostgreSQL, MySQL, and SQL Server with read-only extraction profiles that guarantee zero production mutations.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* How it Works Section */}
        <section id="how-it-works" className="py-24 px-6 lg:px-14">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold mb-16 tracking-tight text-center">How it Works</h2>
            <div className="space-y-12">
              <div className="flex flex-col md:flex-row gap-8 items-center">
                <div className="flex-1 space-y-4">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-primary to-blue-500 text-white font-bold text-lg mb-2">1</div>
                  <h3 className="text-2xl font-bold">Connect your Database</h3>
                  <p className="text-muted-foreground">Provide a read-only string. We automatically inspect your relational tables and foreign keys without caching any row data.</p>
                </div>
                <div className="flex-1 bg-gradient-to-br from-primary/5 to-blue-500/5 rounded-2xl p-6 border border-primary/10 aspect-video flex items-center justify-center shadow-inner">
                  <div className="text-4xl">🔗 ➜ 🗄️</div>
                </div>
              </div>
              <div className="flex flex-col md:flex-row-reverse gap-8 items-center">
                <div className="flex-1 space-y-4">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-primary to-blue-500 text-white font-bold text-lg mb-2">2</div>
                  <h3 className="text-2xl font-bold">Extract Semantic Rules</h3>
                  <p className="text-muted-foreground">Our semantic engine translates relational constraints into formal logic triples, saved to a secure Quad-Store for fast inference.</p>
                </div>
                <div className="flex-1 bg-gradient-to-br from-primary/5 to-blue-500/5 rounded-2xl p-6 border border-primary/10 aspect-video flex items-center justify-center shadow-inner">
                  <div className="text-4xl">🗄️ ➜ 🧠</div>
                </div>
              </div>
              <div className="flex flex-col md:flex-row gap-8 items-center">
                <div className="flex-1 space-y-4">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-primary to-blue-500 text-white font-bold text-lg mb-2">3</div>
                  <h3 className="text-2xl font-bold">Real-Time Validation</h3>
                  <p className="text-muted-foreground">Send agent payloads to our API. We re-hydrate the rule graph in application memory, run description logic checks, and respond in &lt; 5ms.</p>
                </div>
                <div className="flex-1 bg-gradient-to-br from-primary/5 to-blue-500/5 rounded-2xl p-6 border border-primary/10 aspect-video flex items-center justify-center shadow-inner">
                  <div className="text-4xl">🤖 ➜ ✅</div>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* Pricing Section */}
        <section id="pricing" className="py-24 bg-muted/30 px-6 lg:px-14 border-t border-border/50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">Simple, predictable pricing</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-lg">Start building your logical firewall today.</p>
            </div>
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <Card className="border-border/50 shadow-md bg-background">
                <CardHeader>
                  <CardTitle className="text-2xl">Developer Trial</CardTitle>
                  <CardDescription>Perfect for proof-of-concepts and exploration.</CardDescription>
                  <div className="mt-4 text-4xl font-bold">$0<span className="text-lg text-muted-foreground font-normal"> / 30 days</span></div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 text-muted-foreground">
                    <li className="flex items-center gap-2"><span>✓</span> PostgreSQL, MySQL, SQL Server</li>
                    <li className="flex items-center gap-2"><span>✓</span> Up to 5 Active Structural Rules</li>
                    <li className="flex items-center gap-2"><span>✓</span> Manual Schema Refresh</li>
                    <li className="flex items-center gap-2"><span>✓</span> 500 Row Scan Depth limit</li>
                  </ul>
                </CardContent>
              </Card>
              <Card className="border-primary/50 shadow-xl bg-background relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary via-blue-400 to-indigo-500"></div>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-2xl text-primary">Enterprise Premium</CardTitle>
                      <CardDescription>For production AI deployments.</CardDescription>
                    </div>
                    <span className="bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full">RECOMMENDED</span>
                  </div>
                  <div className="mt-4 text-4xl font-bold">Custom</div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 text-muted-foreground">
                    <li className="flex items-center gap-2"><span>✓</span> Custom Connection Drivers</li>
                    <li className="flex items-center gap-2"><span>✓</span> Uncapped Expression Fields</li>
                    <li className="flex items-center gap-2"><span>✓</span> Automated Webhook Syncing</li>
                    <li className="flex items-center gap-2"><span>✓</span> Hard Mode Description Logic</li>
                    <li className="flex items-center gap-2"><span>✓</span> Virtual Fetch Lookups</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/50 py-12 px-6 lg:px-14 bg-background">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center font-bold text-white text-xs">R</div>
            <span className="font-semibold tracking-tight text-sm">ReasonsForALL Inc.</span>
          </div>
          <p className="text-sm text-muted-foreground">© 2026 ReasonsForALL Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
