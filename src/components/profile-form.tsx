"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ProfileForm({ name, email, role }: { name?: string | null; email?: string | null; role?: string }) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  async function submit(formData: FormData) {
    const nextName = String(formData.get("name") ?? "");
    const password = String(formData.get("password") ?? "");

    setIsSaving(true);
    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nextName, password }),
    });
    setIsSaving(false);

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      toast.error(data?.error || "Could not update profile");
      return;
    }

    toast.success("Profile updated");
    router.refresh();
  }

  return (
    <form action={submit} className="grid gap-4">
      <label className="space-y-2">
        <span className="text-sm font-medium text-slate-700">Name</span>
        <Input name="name" defaultValue={name ?? ""} required />
      </label>
      <label className="space-y-2">
        <span className="text-sm font-medium text-slate-700">Email</span>
        <Input value={email ?? ""} readOnly />
      </label>
      <label className="space-y-2">
        <span className="text-sm font-medium text-slate-700">Role</span>
        <Input value={role ?? ""} readOnly />
      </label>
      <label className="space-y-2">
        <span className="text-sm font-medium text-slate-700">New password</span>
        <Input name="password" type="password" placeholder="Leave blank to keep current password" />
      </label>
      <div className="flex justify-end">
        <Button disabled={isSaving}>
          <Save className="size-4" />
          {isSaving ? "Saving..." : "Save Profile"}
        </Button>
      </div>
    </form>
  );
}
