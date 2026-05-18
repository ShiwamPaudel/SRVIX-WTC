"use client";

import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select";
import type { Customer } from "@/types/service";

export function CustomerForm() {
  const router = useRouter();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries()) as Partial<Customer>;

    const response = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      toast.error("Could not create customer", { description: data.error ?? "Please check the required fields." });
      return;
    }

    toast.success("Customer created");
    router.push("/machines");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-2">
      <label className="space-y-2 lg:col-span-2">
        <span className="text-sm font-medium text-slate-700">Customer / institution name</span>
        <Input name="NameOfCustomer" required />
      </label>
      <label className="space-y-2 lg:col-span-2">
        <span className="text-sm font-medium text-slate-700">Address</span>
        <Input name="Address" />
      </label>
      <label className="space-y-2">
        <span className="text-sm font-medium text-slate-700">District</span>
        <Input name="District" />
      </label>
      <label className="space-y-2">
        <span className="text-sm font-medium text-slate-700">Province</span>
        <Input name="Province" />
      </label>
      <label className="space-y-2 lg:col-span-2">
        <span className="text-sm font-medium text-slate-700">Customer type</span>
        <SelectNative name="CustomerType" defaultValue="Hospital">
          <option>Hospital</option>
          <option>Clinic</option>
          <option>Diagnostic Center</option>
          <option>Distributor</option>
          <option>Other</option>
        </SelectNative>
      </label>
      <div className="flex justify-end lg:col-span-2">
        <Button>
          <Save className="size-4" />
          Save customer
        </Button>
      </div>
    </form>
  );
}
