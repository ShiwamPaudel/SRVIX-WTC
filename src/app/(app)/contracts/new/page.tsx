import { BackButton } from "@/components/back-button";
import { ContractRenewalForm } from "@/components/contract-renewal-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServiceDataset } from "@/lib/data";

export default async function NewContractRenewalPage() {
  const { customers, machines } = await getServiceDataset();

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#00000c]">Create Contract Renewal</h1>
          <p className="text-sm text-slate-500">Select the institution, choose a machine, and generate the renewed coverage with PMS dates.</p>
        </div>
        <BackButton fallback="/contracts" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Renewal Details</CardTitle>
        </CardHeader>
        <CardContent>
          <ContractRenewalForm customers={customers} machines={machines} />
          <p className="mt-4 text-sm text-slate-500">
            RRC is handled as a contract type for a specific machine. Use remarks for reagent rental commitments, pricing notes, or supply terms.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
