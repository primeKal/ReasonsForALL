import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function ApiKeysPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">API Keys</h1>
          <p className="text-muted-foreground mt-2">Manage your developer keys to authenticate AI agents with the Reasoning Engine.</p>
        </div>
        <Button className="text-white shadow-md">+ Generate New Key</Button>
      </div>
      
      <Separator className="bg-border/50" />

      <Card className="border-border/50 shadow-md">
        <CardHeader>
          <CardTitle>Active API Keys</CardTitle>
          <CardDescription>These keys grant direct access to your payload validation endpoints.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border/50 overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Key Name</TableHead>
                  <TableHead>Token Fragment</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Production Agent Key</TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">sk-live-••••••••••••a89f</TableCell>
                  <TableCell className="text-sm">Oct 12, 2026</TableCell>
                  <TableCell className="text-sm text-green-600">Just now</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">Revoke</Button>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Testing Environment</TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">sk-test-••••••••••••3b2c</TableCell>
                  <TableCell className="text-sm">Oct 10, 2026</TableCell>
                  <TableCell className="text-sm text-muted-foreground">2 days ago</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">Revoke</Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <div className="mt-8 p-6 rounded-xl border border-border/50 bg-muted/20">
        <h3 className="text-lg font-bold mb-2">How to use API keys</h3>
        <p className="text-sm text-muted-foreground mb-4">
          When sending real-time transactional payloads to the <code className="bg-muted px-1.5 py-0.5 rounded text-primary">/reasoning/verify</code> endpoint, attach the API key in the Authorization header:
        </p>
        <pre className="p-4 rounded-lg bg-black text-white overflow-x-auto text-sm border border-border/50">
          <code>
            {`curl -X POST https://api.reasonsforall.com/v1/reasoning/verify \\
  -H "Authorization: Bearer sk-live-..." \\
  -H "Content-Type: application/json" \\
  -d '{"agent_intent": "create_user", "payload": {"email": "test@example.com"}}'`}
          </code>
        </pre>
      </div>
    </div>
  );
}
