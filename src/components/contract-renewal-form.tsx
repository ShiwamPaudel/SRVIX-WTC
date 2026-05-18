"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FilePlus2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select";
import type { Customer, Machine } from "@/types/service";

export function ContractRenewalForm({ customers, machines }: { customers: Customer[]; machines: Machine[] }) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState("");
  const [machineId, setMachineId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const customerMachines = useMemo(
    () => machines.filter((machine) => !customerId || machine.CustomerID === customerId),
    [customerId, machines],
  );
  const selectedMachine = machines.find((machine) => machine.MachineID === machineId);
  const defaultInterval = selectedMachine?.PMSIntervalDays || selectedMachine?.PMSFrequency || "90";

  async function submit(formData: FormData) {
    setIsSubmitting(true);
    const response = await fetch("/api/contracts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        machineId,
        contractType: formData.get("contractType"),
        contractStart: formData.get("contractStart"),
        renewalYears: formData.get("renewalYears"),
        pmsIntervalDays: formData.get("pmsIntervalDays"),
        remarks: formData.get("remarks"),
      }),
    });
    setIsSubmitting(false);

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      toast.error(data?.error || "Could not update contract");
      return;
    }

    toast.success("Contract updated and PMS dates generated");
    router.push("/contracts");
    router.refresh();
  }

  return (
    <form action={submit} className="grid gap-4 lg:grid-cols-2">
      <label className="space-y-2">
        <span className="text-sm font-medium text-slate-700">Institution</span>
        <SelectNative
          value={customerId}
          onChange={(event) => {
            setCustomerId(event.target.value);
            setMachineId("");
          }}
          aria-label="Customer"
        >
          <option value="">Select institution</option>
          {customers.map((customer) => (
            <option key={customer.CustomerID} value={customer.CustomerID}>
              {customer.HospitalName || customer.NameOfCustomer}
            </option>
          ))}
        </SelectNative>
      </label>
      <label className="space-y-2">
        <span className="text-sm font-medium text-slate-700">Machine</span>
        <SelectNative value={machineId} onChange={(event) => setMachineId(event.target.value)} aria-label="Machine">
          <option value="">Select machine</option>
          {customerMachines.map((machine) => (
            <option key={machine.MachineID} value={machine.MachineID}>
              {[machine.Model, machine.SerialNumber, machine.Department].filter(Boolean).join(" - ")}
            </option>
          ))}
        </SelectNative>
      </label>
      <label className="space-y-2">
        <span className="text-sm font-medium text-slate-700">Contract type</span>
        <SelectNative name="contractType" defaultValue="AMC" aria-label="Contract type">
          <option value="AMC">AMC</option>
          <option value="CMC">CMC</option>
          <option value="RRC">RRC</option>
        </SelectNative>
      </label>
      <label className="space-y-2">
        <span className="text-sm font-medium text-slate-700">Renewal years</span>
        <Input name="renewalYears" type="number" min="1" step="1" defaultValue="1" aria-label="Renewal years" />
      </label>
      <label className="space-y-2">
        <span className="text-sm font-medium text-slate-700">Contract start</span>
        <Input name="contractStart" type="date" defaultValue={new Date().toISOString().slice(0, 10)} aria-label="Contract start" />
      </label>
      <label className="space-y-2">
        <span className="text-sm font-medium text-slate-700">PMS interval days</span>
        <Input name="pmsIntervalDays" type="number" min="1" step="1" value={defaultInterval} readOnly aria-label="PMS interval days" />
      </label>
      <label className="space-y-2 lg:col-span-2">
        <span className="text-sm font-medium text-slate-700">Remarks</span>
        <Input name="remarks" placeholder="Remarks or reagent rental terms" aria-label="Remarks" />
      </label>
      <div className="flex justify-end lg:col-span-2">
        <Button disabled={isSubmitting || !machineId}>
          <FilePlus2 className="size-4" />
          {isSubmitting ? "Creating..." : "Create Renewal"}
        </Button>
      </div>
    </form>
  );
}
