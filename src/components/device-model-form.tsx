"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DeviceModel } from "@/types/service";

export function DeviceModelForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries()) as Partial<DeviceModel>;

    try {
      const response = await fetch("/api/device-models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        toast.error("Could not create model", { description: data.error ?? "Please check the required fields." });
        setIsSubmitting(false);
        return;
      }

      toast.success("Device model created");
      router.push("/machines/new");
      router.refresh();
    } catch {
      toast.error("Could not create model", { description: "Please check your connection and try again." });
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-2">
      <label className="space-y-2">
        <span className="text-sm font-medium text-slate-700">Brand name</span>
        <Input name="BrandName" required />
      </label>
      <label className="space-y-2">
        <span className="text-sm font-medium text-slate-700">Model</span>
        <Input name="Model" required />
      </label>
      <label className="space-y-2">
        <span className="text-sm font-medium text-slate-700">PMS frequency in days</span>
        <Input name="PMSFrequency" type="number" min="1" required />
      </label>
      <label className="space-y-2">
        <span className="text-sm font-medium text-slate-700">Image URL</span>
        <Input name="ImageURL" placeholder="Optional public image URL" />
      </label>
      <div className="flex justify-end lg:col-span-2">
        <Button disabled={isSubmitting}>
          <Save className="size-4" />
          {isSubmitting ? "Saving..." : "Save model"}
        </Button>
      </div>
    </form>
  );
}
