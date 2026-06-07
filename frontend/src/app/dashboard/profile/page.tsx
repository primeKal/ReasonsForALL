import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile & Configuration</h1>
        <p className="text-muted-foreground mt-2">Manage your account details and enterprise configuration.</p>
      </div>
      <Separator className="bg-border/50" />
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border/50 shadow-md">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Update your personal details here.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" defaultValue="John Doe" className="bg-background/50" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" defaultValue="m@example.com" disabled className="bg-muted/50 text-muted-foreground" />
            </div>
          </CardContent>
          <CardFooter>
            <Button className="text-white">Save Changes</Button>
          </CardFooter>
        </Card>

        <Card className="border-border/50 shadow-md">
          <CardHeader>
            <CardTitle>Enterprise Configuration</CardTitle>
            <CardDescription>Manage your company settings and tier details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company">Company Name</Label>
              <Input id="company" defaultValue="Acme Inc." className="bg-background/50" />
            </div>
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
              <h4 className="font-semibold text-primary">Current Plan: Free Trial</h4>
              <p className="text-sm text-muted-foreground">Expires in 28 days.</p>
              <div className="w-full bg-primary/20 rounded-full h-2 mt-2">
                <div className="bg-primary h-2 rounded-full w-[10%]"></div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full border-primary/20 hover:bg-primary/5 text-primary">Upgrade to Premium</Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
