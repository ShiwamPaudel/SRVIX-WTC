import { EngineerAccountForm } from "@/components/engineer-account-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewEngineerPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#12384f]">Create Engineer Account</h1>
        <p className="text-sm text-slate-500">Create the field engineer profile and login access in one step.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Engineer Details</CardTitle>
        </CardHeader>
        <CardContent>
          <EngineerAccountForm />
        </CardContent>
      </Card>
    </div>
  );
}
