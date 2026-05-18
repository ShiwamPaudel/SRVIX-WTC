"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function EngineerAccountForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(formData: FormData) {
    setIsSubmitting(true);
    const response = await fetch("/api/engineers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        EngineerName: formData.get("EngineerName"),
        Phone: formData.get("Phone"),
        Email: formData.get("Email"),
        Department: formData.get("Department"),
        Role: formData.get("Role"),
        Password: formData.get("Password"),
      }),
    });
    setIsSubmitting(false);

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      toast.error(data?.error || "Could not create engineer");
      return;
    }

    toast.success("Engineer account created");
    router.push("/engineers");
    router.refresh();
  }

  return (
    <form action={submit} className="grid gap-3 lg:grid-cols-3">
      <Input name="EngineerName" placeholder="Engineer name" required />
      <Input name="Email" type="email" placeholder="Login email" required />
      <Input name="Password" type="password" placeholder="Initial password" required />
      <Input name="Phone" placeholder="Phone" />
      <Input name="Department" placeholder="Department" />
      <Input name="Role" placeholder="Role" defaultValue="Engineer" />
      <Button className="lg:col-span-3" disabled={isSubmitting}>
        <UserPlus className="size-4" />
        {isSubmitting ? "Creating..." : "Create Engineer Account"}
      </Button>
    </form>
  );
}
