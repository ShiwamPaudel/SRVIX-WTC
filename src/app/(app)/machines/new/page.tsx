import { MachineForm } from "@/components/machine-form";
import { getServiceDataset } from "@/lib/data";

export default async function NewMachinePage() {
  const { customers, deviceModels } = await getServiceDataset();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">New machine</h1>
        <p className="text-sm text-slate-500">
          Add an installed machine and generate PMS rows from warranty and service frequency.
        </p>
      </div>
      <MachineForm customers={customers} deviceModels={deviceModels} />
    </div>
  );
}
