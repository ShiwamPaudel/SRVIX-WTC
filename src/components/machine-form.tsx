"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { addDays, addMonths, formatDate } from "@/lib/utils";
import type { Customer, DeviceModel, Installation } from "@/types/service";

function parseDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function MachineForm({ customers, deviceModels }: { customers: Customer[]; deviceModels: DeviceModel[] }) {
  const router = useRouter();
  const [installationDate, setInstallationDate] = useState(new Date().toISOString().slice(0, 10));
  const [warrantyYears, setWarrantyYears] = useState("1");
  const [modelId, setModelId] = useState("");

  const selectedModel = deviceModels.find((model) => model.ModelID === modelId);

  const preview = useMemo(() => {
    const installed = parseDate(installationDate);
    const years = Number(warrantyYears);
    const interval = Number(selectedModel?.PMSFrequency ?? 0);
    if (!installed || !Number.isFinite(years) || years <= 0 || !Number.isFinite(interval) || interval <= 0) {
      return { expiry: "", pmsDates: [] as string[] };
    }

    const expiry = addMonths(installed, years * 12);
    const pmsDates: string[] = [];
    let next = addDays(installed, interval);
    while (next <= expiry && pmsDates.length < 8) {
      pmsDates.push(formatDate(next));
      next = addDays(next, interval);
    }

    return { expiry: formatDate(expiry), pmsDates };
  }, [installationDate, selectedModel?.PMSFrequency, warrantyYears]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries()) as Partial<Installation>;

    const response = await fetch("/api/machines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      toast.error("Could not create installation", { description: data.error ?? "Please check the required fields." });
      return;
    }

    const data = (await response.json()) as { installation: Installation; pms: unknown[] };
    toast.success("Installation created", { description: `${data.pms.length} PMS rows generated.` });
    router.push(`/machines?q=${encodeURIComponent(data.installation.SerialNumber)}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 xl:grid-cols-[1fr_340px]">
      <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-2">
        <label className="space-y-2 lg:col-span-2">
          <span className="text-sm font-medium text-slate-700">Customer / institution</span>
          <SelectNative name="CustomerID" required>
            <option value="">Select customer</option>
            {customers.map((customer) => (
              <option key={customer.CustomerID} value={customer.CustomerID}>
                {customer.NameOfCustomer || customer.HospitalName}
              </option>
            ))}
          </SelectNative>
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Department / installed location</span>
          <Input name="Department" placeholder="ICU, OT, Radiology..." />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Device model</span>
          <SelectNative name="ModelID" required value={modelId} onChange={(event) => setModelId(event.target.value)}>
            <option value="">Select model</option>
            {deviceModels.map((model) => (
              <option key={model.ModelID} value={model.ModelID}>
                {model.Model}
              </option>
            ))}
          </SelectNative>
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Brand</span>
          <Input value={selectedModel?.BrandName ?? ""} readOnly placeholder="Auto-filled from model" />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">PMS frequency</span>
          <Input value={selectedModel?.PMSFrequency ? `${selectedModel.PMSFrequency} days` : ""} readOnly placeholder="Auto-filled" />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Serial number</span>
          <Input name="SerialNumber" required />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Installation date</span>
          <Input
            name="InstallationDate"
            type="date"
            required
            value={installationDate}
            onChange={(event) => setInstallationDate(event.target.value)}
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Warranty in years</span>
          <Input
            name="WarrantyYears"
            type="number"
            min="0.1"
            step="0.1"
            required
            value={warrantyYears}
            onChange={(event) => setWarrantyYears(event.target.value)}
          />
        </label>
        <label className="space-y-2 lg:col-span-2">
          <span className="text-sm font-medium text-slate-700">Photo URL override</span>
          <Input name="ImageURL" placeholder="Optional public image URL" />
        </label>
        <label className="space-y-2 lg:col-span-2">
          <span className="text-sm font-medium text-slate-700">Remarks</span>
          <Textarea name="Remarks" />
        </label>
        <div className="flex justify-end lg:col-span-2">
          <Button>
            <Save className="size-4" />
            Save installation
          </Button>
        </div>
      </div>

      <aside className="space-y-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-5 text-sky-600" />
            <h2 className="font-semibold text-slate-950">Auto calculation</h2>
          </div>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Warranty expiry</dt>
              <dd className="font-medium text-slate-900">{preview.expiry || "Set valid inputs"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">First PMS dates</dt>
              <dd className="mt-2 space-y-1">
                {preview.pmsDates.length ? (
                  preview.pmsDates.map((date) => (
                    <span key={date} className="mr-2 inline-flex rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-800">
                      {date}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-500">Select a model with PMS frequency.</span>
                )}
              </dd>
            </div>
          </dl>
        </div>
      </aside>
    </form>
  );
}
