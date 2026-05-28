import Link from "next/link";
import { redirect } from "next/navigation";
import { Database, FolderOpen, MapPinned, ShieldCheck, Users } from "lucide-react";
import { auth } from "@/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

function statusBadge(active: boolean) {
  return <Badge variant={active ? "green" : "amber"}>{active ? "Configured" : "Needs setup"}</Badge>;
}

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "Admin") redirect("/dashboard");

  const workDriveConfigured = Boolean(
    process.env.ZOHO_CLIENT_ID &&
      process.env.ZOHO_CLIENT_SECRET &&
      process.env.ZOHO_REFRESH_TOKEN &&
      process.env.ZOHO_WORKDRIVE_ROOT_FOLDER_ID,
  );
  const tursoConfigured = Boolean(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Settings</h1>
        <p className="text-sm text-slate-500">Admin controls for access, storage, maps, and operational configuration.</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShieldCheck className="size-5 text-sky-600" /> Access Control</CardTitle>
            <CardDescription>Settings is restricted to Admin users only.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild variant="secondary">
              <Link href="/engineers"><Users className="size-4" /> Manage engineers</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/profile"><ShieldCheck className="size-4" /> My profile</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FolderOpen className="size-5 text-sky-600" /> Service Report Storage</CardTitle>
            <CardDescription>Files stay in Zoho WorkDrive. Turso stores only the returned link.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
              <span className="text-sm font-medium text-slate-700">Zoho WorkDrive</span>
              {statusBadge(workDriveConfigured)}
            </div>
            <div className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
              <span className="text-sm font-medium text-slate-700">Data center</span>
              <Badge variant="blue">{process.env.ZOHO_DATA_CENTER || "com"}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><MapPinned className="size-5 text-sky-600" /> Maps & Location</CardTitle>
            <CardDescription>OpenStreetMap is used for customer sites, ticket pins, and engineer live map check-ins.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
              <span className="text-sm font-medium text-slate-700">OpenStreetMap viewer</span>
              <Badge variant="green">No API key</Badge>
            </div>
            <Button asChild variant="secondary">
              <Link href="/maps"><MapPinned className="size-4" /> Open live map</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Database className="size-5 text-sky-600" /> Data Layer</CardTitle>
            <CardDescription>Operational records stay in Turso; binary files should not be stored there.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
              <span className="text-sm font-medium text-slate-700">Turso database</span>
              {statusBadge(tursoConfigured)}
            </div>
            <p className="text-sm text-slate-500">Storage policy: ticket metadata, report links, signatures, and audit rows in Turso; PDFs and photos in Zoho WorkDrive.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
