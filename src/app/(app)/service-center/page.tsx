import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Cpu, ExternalLink, ImageIcon, Send, Wrench } from "lucide-react";
import { auth } from "@/auth";
import {
  closeServiceCenterTask,
  createServiceCenterTask,
  deployServiceCenterMachine,
  markServiceCenterRepaired,
} from "@/lib/service-center-actions";
import {
  SERVICE_CENTER_REPAIRED_STATUS,
  latestOpenMovementByInstallation,
  machineLabel,
  tasksByMovement,
} from "@/lib/service-center";
import { isAdmin } from "@/lib/permissions";
import { dataService } from "@/lib/turso/service";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export const dynamic = "force-dynamic";

function statusVariant(status: string) {
  if (status === SERVICE_CENTER_REPAIRED_STATUS) return "green";
  if (status === "Under Repair") return "amber";
  return "blue";
}

function DevicePhoto({ machine }: { machine: { ImageURL?: string; DeviceName?: string; Model?: string } }) {
  if (machine.ImageURL) {
    return (
      <img
        src={machine.ImageURL}
        alt={[machine.DeviceName, machine.Model].filter(Boolean).join(" ") || "Device photo"}
        className="h-full w-full object-cover"
      />
    );
  }

  return (
    <div className="grid h-full w-full place-items-center bg-slate-100 text-slate-400">
      <div className="text-center">
        <ImageIcon className="mx-auto size-8" />
        <p className="mt-2 text-xs font-medium text-slate-500">No photo</p>
      </div>
    </div>
  );
}

export default async function ServiceCenterPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userIsAdmin = isAdmin(session.user.role);
  const currentEngineerId = session.user.engineerId ?? "";
  const [machines, customers, movements, tasks] = await Promise.all([
    dataService.machines(),
    dataService.customers(),
    dataService.serviceCenterMovements(),
    dataService.serviceCenterTasks(),
  ]);
  const movementByInstallation = latestOpenMovementByInstallation(movements);
  const taskGroups = tasksByMovement(tasks);
  const rows = machines
    .map((machine) => {
      const movement = movementByInstallation.get(machine.InstallationID ?? machine.MachineID);
      return movement ? { machine, movement, tasks: taskGroups.get(movement.MovementID) ?? [] } : null;
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .sort((a, b) => b.movement.ReceivedAt.localeCompare(a.movement.ReceivedAt));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Service Center</h1>
        <p className="text-sm text-slate-500">Machines currently inside the service center and the work done on them.</p>
      </div>

      <div className="space-y-4">
        {rows.map(({ machine, movement, tasks }) => {
          const openTasks = tasks.filter((task) => task.Status !== "Closed");
          const recentTasks = [...tasks].sort((a, b) => (b.ClosedAt || b.CreatedAt).localeCompare(a.ClosedAt || a.CreatedAt));
          const currentEngineerOpenTask = openTasks.find((task) => task.EngineerID === currentEngineerId);
          const canCreateTask = currentEngineerId && !currentEngineerOpenTask && movement.Status !== SERVICE_CENTER_REPAIRED_STATUS;
          const canDeploy = movement.Status === SERVICE_CENTER_REPAIRED_STATUS;

          return (
            <Card key={movement.MovementID}>
              <CardHeader className="gap-3 sm:flex sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle>{machineLabel(machine)}</CardTitle>
                  <p className="mt-1 text-sm text-slate-500">
                    Brought from {movement.FromCustomerName || machine.NameOfCustomer || "customer not linked"}
                    {movement.FromDepartment ? ` - ${movement.FromDepartment}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Received {formatDateTime(movement.ReceivedAt)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={statusVariant(movement.Status)}>{movement.Status || "In Service Center"}</Badge>
                  <Button asChild variant="secondary" size="sm">
                    <Link href={`/machines/${machine.MachineID}`}>
                      <ExternalLink className="size-4" />
                      Machine
                    </Link>
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="grid gap-4 xl:grid-cols-[220px_1fr_360px]">
                <Link
                  href={`/machines/${machine.MachineID}`}
                  className="block overflow-hidden rounded-md border border-slate-200 bg-slate-50"
                  aria-label={`Open ${machineLabel(machine)} machine details`}
                >
                  <div className="aspect-[4/3] xl:h-full xl:min-h-56">
                    <DevicePhoto machine={machine} />
                  </div>
                </Link>

                <div className="space-y-3">
                  {recentTasks.length ? (
                    recentTasks.slice(0, 4).map((task) => (
                      <div key={task.TaskID} className="rounded-md border border-slate-200 p-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="font-semibold text-slate-950">{task.Title}</p>
                            <p className="text-sm text-slate-500">
                              {task.EngineerName || task.EngineerID} - {task.Status === "Closed" ? `Closed ${formatDateTime(task.ClosedAt)}` : `Started ${formatDateTime(task.CreatedAt)}`}
                            </p>
                          </div>
                          <Badge variant={task.Status === "Closed" ? "green" : "amber"}>{task.Status}</Badge>
                        </div>
                        {task.Remarks || task.ClosedRemarks ? (
                          <p className="mt-2 text-sm text-slate-600">{task.ClosedRemarks || task.Remarks}</p>
                        ) : null}
                        {task.Status !== "Closed" && task.EngineerID === currentEngineerId ? (
                          <form action={closeServiceCenterTask} className="mt-3 flex flex-col gap-2 sm:flex-row">
                            <input type="hidden" name="taskId" value={task.TaskID} />
                            <Input name="closedRemarks" placeholder="Closing note" />
                            <Button size="sm">
                              <CheckCircle2 className="size-4" />
                              Close
                            </Button>
                          </form>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-md bg-slate-50 p-4 text-sm text-slate-500">No tasks yet.</div>
                  )}
                </div>

                <div className="space-y-4">
                  {canCreateTask ? (
                    <form action={createServiceCenterTask} className="space-y-3 rounded-md border border-slate-200 p-3">
                      <input type="hidden" name="movementId" value={movement.MovementID} />
                      <input type="hidden" name="installationId" value={movement.InstallationID} />
                      <div className="flex items-center gap-2">
                        <Wrench className="size-4 text-sky-600" />
                        <p className="font-semibold text-slate-950">Create task</p>
                      </div>
                      <Input name="title" placeholder="Task title" required />
                      <Textarea name="remarks" placeholder="Optional notes" />
                      <Button className="w-full justify-center">
                        <Wrench className="size-4" />
                        Start task
                      </Button>
                    </form>
                  ) : currentEngineerOpenTask ? (
                    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                      You already have an open task on this machine.
                    </div>
                  ) : currentEngineerId && movement.Status === SERVICE_CENTER_REPAIRED_STATUS ? (
                    <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                      This machine is marked repaired and ready for admin deployment.
                    </div>
                  ) : null}

                  {userIsAdmin ? (
                    <div className="space-y-3 rounded-md border border-slate-200 p-3">
                      <div className="flex items-center gap-2">
                        <Cpu className="size-4 text-sky-600" />
                        <p className="font-semibold text-slate-950">Admin</p>
                      </div>
                      <form action={markServiceCenterRepaired}>
                        <input type="hidden" name="movementId" value={movement.MovementID} />
                        <Button variant="secondary" size="sm" className="w-full justify-center" disabled={movement.Status === SERVICE_CENTER_REPAIRED_STATUS}>
                          <CheckCircle2 className="size-4" />
                          Mark repaired
                        </Button>
                      </form>
                      <form action={deployServiceCenterMachine} className="space-y-2">
                        <input type="hidden" name="movementId" value={movement.MovementID} />
                        <SelectNative name="customerId" defaultValue={movement.FromCustomerID} required>
                          <option value="">Deploy to customer</option>
                          {customers.map((customer) => (
                            <option key={customer.CustomerID} value={customer.CustomerID}>
                              {customer.HospitalName || customer.NameOfCustomer}
                            </option>
                          ))}
                        </SelectNative>
                        <Input name="department" placeholder="Department / location" defaultValue={movement.FromDepartment} />
                        {!canDeploy ? <p className="text-xs text-slate-500">Mark repaired before deployment.</p> : null}
                        <Button size="sm" className="w-full justify-center" disabled={!canDeploy}>
                          <Send className="size-4" />
                          Deploy
                        </Button>
                      </form>
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {!rows.length ? (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
            <Cpu className="mx-auto size-10 text-slate-300" />
            <h2 className="mt-3 text-lg font-semibold text-slate-950">No machines in the service center</h2>
            <p className="mt-1 text-sm text-slate-500">Returned machines will appear here.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
