import { AlertTriangle, CalendarClock, CheckCircle2 } from "lucide-react";
import { ContractRenewalForm } from "@/components/contract-renewal-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { getServiceDataset } from "@/lib/data";
import type { Machine } from "@/types/service";

type ContractMachine = {
  machine: Machine;
  customerName: string;
  expiryDate: Date;
  expiryLabel: string;
  source: "Warranty" | "Contract";
  contractType: string;
};

function parseDate(value?: string) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysUntil(date: Date, today: Date) {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  return Math.round((end - start) / 86400000);
}

export default async function ContractsPage() {
  const { machines, customers, contracts } = await getServiceDataset();
  const today = new Date();

  const rows = machines
    .map<ContractMachine | null>((machine) => {
      const customer = customers.find((item) => item.CustomerID === machine.CustomerID);
      const machineContracts = contracts
        .filter((contract) => contract.InstallationID === machine.InstallationID)
        .sort((a, b) => new Date(b.ContractEnd).getTime() - new Date(a.ContractEnd).getTime());
      const latestContract = machineContracts[0];
      const expiryValue = latestContract?.ContractEnd || machine.WarrantyExpiry;
      const expiryDate = parseDate(expiryValue);

      if (!expiryDate) return null;

      return {
        machine,
        customerName: customer?.HospitalName || customer?.NameOfCustomer || machine.NameOfCustomer || "Customer not linked",
        expiryDate,
        expiryLabel: expiryValue,
        source: latestContract ? "Contract" : "Warranty",
        contractType: latestContract?.ContractType || "Warranty",
      };
    })
    .filter((row): row is ContractMachine => row != null)
    .sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime());

  const expired = rows.filter((row) => row.expiryDate < today);
  const expiringSoon = rows.filter((row) => {
    const days = daysUntil(row.expiryDate, today);
    return days >= 0 && days <= 30;
  });
  const active = rows.filter((row) => row.expiryDate >= today && !expiringSoon.includes(row));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Contracts</h1>
        <p className="text-sm text-slate-500">Track machines whose warranty or contract has expired, or will expire in the next 30 days.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Metric title="Expired" value={expired.length} tone="rose" icon={AlertTriangle} />
        <Metric title="Expiring 30 days" value={expiringSoon.length} tone="amber" icon={CalendarClock} />
        <Metric title="Active coverage" value={active.length} tone="green" icon={CheckCircle2} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Renewal</CardTitle>
        </CardHeader>
        <CardContent>
          <ContractRenewalForm customers={customers} machines={machines} />
          <p className="mt-3 text-sm text-slate-500">
            RRC is a contract type for a specific machine. Use remarks for reagent rental commitments or reagent pricing terms.
          </p>
        </CardContent>
      </Card>

      <ContractList title="Machines Expiring This Month" rows={expiringSoon} empty="No machines expire in the next 30 days." tone="amber" />
      <ContractList title="Expired Machines" rows={expired} empty="No expired machines found." tone="rose" />
      <ContractList title="Active Coverage" rows={active.slice(0, 12)} empty="No active coverage records found." tone="green" />
    </div>
  );
}

function ContractList({
  title,
  rows,
  empty,
  tone,
}: {
  title: string;
  rows: ContractMachine[];
  empty: string;
  tone: "amber" | "rose" | "green";
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((row) => (
          <div key={row.machine.MachineID} className="grid gap-3 rounded-md border border-slate-200 p-3 md:grid-cols-[1fr_180px_160px] md:items-center">
            <div>
              <p className="font-semibold text-slate-950">{row.customerName}</p>
              <p className="text-sm text-slate-600">
                {[row.machine.Model, row.machine.SerialNumber, row.machine.Department].filter(Boolean).join(" - ")}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Expired / Expires</p>
              <p className="text-sm font-semibold text-slate-950">{formatDate(row.expiryLabel)}</p>
            </div>
            <div className="flex justify-start md:justify-end">
              <Badge variant={tone}>{row.contractType}</Badge>
            </div>
          </div>
        ))}
        {!rows.length ? <p className="rounded-md bg-slate-50 p-4 text-sm text-slate-500">{empty}</p> : null}
      </CardContent>
    </Card>
  );
}

function Metric({
  title,
  value,
  icon: Icon,
  tone,
}: {
  title: string;
  value: number;
  icon: typeof AlertTriangle;
  tone: "amber" | "green" | "rose";
}) {
  const classes = {
    amber: "bg-amber-50 text-amber-700",
    green: "bg-emerald-50 text-emerald-700",
    rose: "bg-rose-50 text-rose-700",
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">{title}</p>
        <span className={`grid size-9 place-items-center rounded-md ${classes[tone]}`}>
          <Icon className="size-5" />
        </span>
      </div>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}
