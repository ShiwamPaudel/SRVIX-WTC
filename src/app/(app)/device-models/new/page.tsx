import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DeviceModelForm } from "@/components/device-model-form";

export default async function NewDeviceModelPage() {
  const session = await auth();
  if (session?.user.role !== "Admin") redirect("/machines");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">New device model</h1>
        <p className="text-sm text-slate-500">Admin-only catalog entry used by installation and PMS automation.</p>
      </div>
      <DeviceModelForm />
    </div>
  );
}
