import { CustomerForm } from "@/components/customer-form";

export default function NewCustomerPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">New customer</h1>
        <p className="text-sm text-slate-500">Create the hospital or institution record used by tickets and machines.</p>
      </div>
      <CustomerForm />
    </div>
  );
}
