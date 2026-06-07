'use client'

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

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
      if (!session) {
        router.push('/login');
        return;
      }
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
        console.error(e);
        setError(e.message || 'Failed to load servers. Make sure the backend is running.');
      } finally {
        setLoading(false);
      }
    }
    loadServers();
  }, []);

  const formatSynced = (ts: string) => {
    if (!ts || ts === 'recently') return 'recently';
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return ts;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reasoning Servers</h1>
          <p className="text-muted-foreground mt-2">Manage your connected databases and logical guardrails.</p>
        </div>
        <Link href="/dashboard/servers/create">
          <Button className="text-white shadow-md hover:shadow-lg transition-all">+ Connect Database</Button>
        </Link>
      </div>
      <Separator className="bg-border/50" />
      
      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="border-border/50 shadow-md animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-5 bg-muted rounded w-3/4 mb-2" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="h-3 bg-muted rounded w-full mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <div className="p-6 rounded-xl border border-red-500/20 bg-red-500/5 text-center">
          <p className="text-red-500 font-medium">⚠️ {error}</p>
          <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      ) : servers.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed border-border/60 bg-muted/20">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <span className="text-2xl text-primary">🗄️</span>
          </div>
          <h3 className="text-xl font-bold mb-2">No servers connected</h3>
          <p className="text-muted-foreground mb-6 max-w-sm">Connect your first relational database to generate your semantic logic firewall.</p>
          <Link href="/dashboard/servers/create">
            <Button className="text-white">Connect Database</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {servers.map(server => (
            <Card key={server.id} className="border-border/50 shadow-md hover:border-primary/50 transition-colors group cursor-pointer relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary to-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl">{server.name}</CardTitle>
                  <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">{server.status}</Badge>
                </div>
                <CardDescription>{server.dialect}</CardDescription>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Active Policies</span>
                  <span className="font-semibold text-primary">{server.rules} / 1000</span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5 mt-2 overflow-hidden">
                  <div className="bg-primary h-1.5 rounded-full" style={{ width: `${Math.min((server.rules / 1000) * 100, 100)}%` }}></div>
                </div>
              </CardContent>
              <CardFooter className="pt-4 flex items-center justify-between border-t border-border/40 mt-4 text-xs text-muted-foreground">
                <span>Synced {formatSynced(server.synced)}</span>
                <Link href={`/dashboard/servers/${server.id}`}>
                  <span className="text-primary font-medium hover:underline">View Logic</span>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
