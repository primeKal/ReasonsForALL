import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function ApiKeysPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">API Keys</h1>
          <p className="text-slate-400 mt-2">Manage your developer keys to authenticate AI agents with the Reasoning Engine.</p>
        </div>
        <Button className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold shadow-md shadow-violet-500/10 border border-violet-500/30 hover:-translate-y-0.5 transition-all">
          + Generate New Key
        </Button>
      </div>
      
      <Separator className="bg-white/5" />

      <Card className="bg-slate-950/40 border-white/5 shadow-lg backdrop-blur-md">
        <CardHeader>
          <CardTitle>Active API Keys</CardTitle>
          <CardDescription>These keys grant direct access to your payload validation endpoints.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-white/5 overflow-hidden">
            <Table>
              <TableHeader className="bg-white/5">
                <TableRow>
                  <TableHead className="text-slate-300">Key Name</TableHead>
                  <TableHead className="text-slate-300">Token Fragment</TableHead>
                  <TableHead className="text-slate-300">Created</TableHead>
                  <TableHead className="text-slate-300">Last Used</TableHead>
                  <TableHead className="text-right text-slate-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="hover:bg-white/5 border-b border-white/5">
                  <TableCell className="font-medium text-white">Production Agent Key</TableCell>
                  <TableCell className="font-mono text-sm text-slate-400">sk-live-••••••••••••a89f</TableCell>
                  <TableCell className="text-sm text-slate-300">Oct 12, 2026</TableCell>
                  <TableCell className="text-sm text-emerald-400 font-medium">Just now</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-500/10">Revoke</Button>
                  </TableCell>
                </TableRow>
                <TableRow className="hover:bg-white/5 border-b border-white/5">
                  <TableCell className="font-medium text-white">Testing Environment</TableCell>
                  <TableCell className="font-mono text-sm text-slate-400">sk-test-••••••••••••3b2c</TableCell>
                  <TableCell className="text-sm text-slate-300">Oct 10, 2026</TableCell>
                  <TableCell className="text-sm text-slate-400">2 days ago</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-500/10">Revoke</Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <div className="mt-8 p-6 rounded-xl border border-white/5 bg-slate-950/40 backdrop-blur-md">
        <h3 className="text-lg font-bold mb-2 text-white">How to use API keys</h3>
        <p className="text-sm text-slate-400 mb-4">
          Pass the API key as a Bearer token. The <code className="bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-violet-400 font-mono">server_id</code> is your server&apos;s key visible in the dashboard URL (<code className="bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-violet-400 font-mono">/dashboard/servers/&#123;server_id&#125;</code>):
        </p>
        <pre className="p-4 rounded-lg bg-zinc-950 text-violet-300 overflow-x-auto text-sm border border-white/5 font-mono">
          <code>
            {`curl -X POST https://reasons-for-all-backend-5211259986.us-central1.run.app/reasoning/verify \\
  -H "Authorization: Bearer sk-rfa-..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "server_id": "your-server-key",
    "agent_intent": "DELETE FROM menu_items WHERE id = 5",
    "payload": { "user_role": "customer" },
    "include_details": true
  }'`}
          </code>
        </pre>
      </div>
    </div>
  );
}
