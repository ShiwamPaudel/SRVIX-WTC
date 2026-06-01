import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PlannerCalendar } from "@/components/planner-calendar";
import { isAdmin } from "@/lib/permissions";
import { activateDuePlannerTickets } from "@/lib/planner-tickets";
import { dataService } from "@/lib/turso/service";

export const dynamic = "force-dynamic";

export default async function PlannerPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  await activateDuePlannerTickets();
  const userIsAdmin = isAdmin(session.user.role);
  const [customers, engineers, machines, pmsSchedule, plannedVisits, visitRules, tickets] = await Promise.all([
    dataService.customers(),
    dataService.engineers(),
    dataService.machines(),
    dataService.pmsSchedule(),
    dataService.plannedVisits(),
    dataService.customerVisitRules(),
    dataService.tickets(),
  ]);
  const engineerId = session.user.engineerId ?? "";

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Planner</h1>
          <p className="text-sm text-slate-500">Weekly plans, monthly PMS, tickets, and regular customer visits.</p>
        </div>
      </div>
      <PlannerCalendar
        customers={customers}
        engineers={engineers}
        machines={machines}
        pmsSchedule={userIsAdmin ? pmsSchedule : pmsSchedule.filter((pms) => pms.AssignedEngineer === engineerId)}
        plannedVisits={userIsAdmin ? plannedVisits : plannedVisits.filter((plan) => plan.AssignedEngineer === engineerId)}
        visitRules={userIsAdmin ? visitRules : visitRules.filter((rule) => rule.AssignedEngineer === engineerId)}
        tickets={userIsAdmin ? tickets : tickets.filter((ticket) => ticket.AssignedEngineer === engineerId)}
        canAdmin={userIsAdmin}
        currentEngineerId={engineerId}
      />
    </div>
  );
}
