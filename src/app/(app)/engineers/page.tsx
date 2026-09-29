import Link from "next/link";
import { UserPlus } from "lucide-react";
import { auth } from "@/auth";
import { EngineerCard } from "@/components/engineer-card";
import { LeaveRequestsAdmin } from "@/components/leave-requests-admin";
import { Button } from "@/components/ui/button";
import { isEngineerResigned } from "@/lib/engineers";
import { isAdmin } from "@/lib/permissions";
import { dataService } from "@/lib/turso/service";

export default async function EngineersPage() {
  const [session, engineers, leaveRequests] = await Promise.all([
    auth(),
    dataService.engineers(),
    dataService.leaveRequests(),
  ]);
  const canManage = isAdmin(session?.user.role);
  const orderedEngineers = [...engineers].sort(
    (a, b) =>
      Number(isEngineerResigned(a)) - Number(isEngineerResigned(b)) ||
      a.EngineerName.localeCompare(b.EngineerName),
  );
  const resignedCount = engineers.filter(isEngineerResigned).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#12384f]">Engineers</h1>
          <p className="text-sm text-slate-500">
            Engineer Accounts and Leave Requests Approval / Rejection
            {resignedCount ? ` - ${resignedCount} resigned` : ""}
          </p>
        </div>
        <Button asChild>
          <Link href="/engineers/new">
            <UserPlus className="size-4" />
            New Engineer
          </Link>
        </Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
        {orderedEngineers.map((engineer) => (
          <EngineerCard key={engineer.EngineerID} engineer={engineer} canManage={canManage} />
        ))}
      </div>
      <LeaveRequestsAdmin initialRequests={leaveRequests.sort((a, b) => b.CreatedAt.localeCompare(a.CreatedAt))} />
    </div>
  );
}
