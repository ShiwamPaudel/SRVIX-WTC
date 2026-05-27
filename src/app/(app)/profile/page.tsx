import { redirect } from "next/navigation";
import Image from "next/image";
import { auth } from "@/auth";
import { BackButton } from "@/components/back-button";
import { ProfileForm } from "@/components/profile-form";
import { PushNotificationToggle } from "@/components/push-notification-toggle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#12384f]">Profile</h1>
          <p className="text-sm text-slate-500">Update your account name or password.</p>
        </div>
        <BackButton fallback="/dashboard" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-4">
              <div className="grid size-14 place-items-center rounded-md bg-[#087fb6] text-lg font-semibold text-white">
                {(session.user.name || session.user.email || "U").slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-[#12384f]">{session.user.name}</p>
                <p className="truncate text-sm text-slate-500">{session.user.email}</p>
              </div>
            </div>
            <div className="mt-5 rounded-md bg-[#f4fbff] p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">Role</p>
              <p className="mt-1 text-sm font-semibold text-[#12384f]">{session.user.role}</p>
            </div>
            <div className="mt-4 rounded-md border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">Organization</p>
              <Image src="/Logo - WTC.png" alt="Web Trading Concern Pvt. Ltd." width={150} height={72} className="mt-3 h-12 w-auto object-contain" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <PushNotificationToggle />
            <ProfileForm name={session.user.name} email={session.user.email} role={session.user.role} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
