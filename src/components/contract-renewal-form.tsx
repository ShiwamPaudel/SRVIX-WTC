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
    setMachineId("");
    router.refresh();
  }

  return (
    <form action={submit} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm xl:grid-cols-[1fr_1fr_130px_130px_150px]">
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
      <SelectNative value={machineId} onChange={(event) => setMachineId(event.target.value)} aria-label="Machine">
        <option value="">Select machine</option>
        {customerMachines.map((machine) => (
          <option key={machine.MachineID} value={machine.MachineID}>
            {[machine.Model, machine.SerialNumber, machine.Department].filter(Boolean).join(" - ")}
          </option>
        ))}
      </SelectNative>
      <SelectNative name="contractType" defaultValue="AMC" aria-label="Contract type">
        <option value="AMC">AMC</option>
        <option value="CMC">CMC</option>
        <option value="RRC">RRC</option>
      </SelectNative>
      <Input name="renewalYears" type="number" min="1" step="1" defaultValue="1" aria-label="Renewal years" />
      <Input name="contractStart" type="date" defaultValue={new Date().toISOString().slice(0, 10)} aria-label="Contract start" />
      <Input name="pmsIntervalDays" type="number" min="1" step="1" value={defaultInterval} readOnly aria-label="PMS interval days" />
      <Input className="xl:col-span-3" name="remarks" placeholder="Remarks or reagent rental terms" aria-label="Remarks" />
      <Button disabled={isSubmitting || !machineId}>
        <FilePlus2 className="size-4" />
        {isSubmitting ? "Updating..." : "Create Renewal"}
      </Button>
    </form>
  );
}
