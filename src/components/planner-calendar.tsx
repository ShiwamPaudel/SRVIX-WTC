"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { serviceTypes } from "@/lib/constants";
import { cn, addDays, formatDate, toDateInputValue } from "@/lib/utils";
import type {
  Customer,
  CustomerVisitRule,
  Engineer,
  Machine,
  PlannedVisit,
  PlannerStatus,
  PMSSchedule,
  Ticket,
} from "@/types/service";

type PlannerEvent = {
  id: string;
  source: "pms" | "plan" | "rule" | "ticket";
  type: "PMS" | "Ticket" | "General Visit";
  date: string;
  customerId: string;
  machineId?: string;
  engineerId: string;
  status: string;
  title: string;
  detail: string;
  pmsId?: string;
  planId?: string;
  ruleId?: string;
  ticketId?: string;
};

const planStatuses: PlannerStatus[] = ["Planned", "Done", "Missed", "Cancelled"];
const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function startOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function calendarDays(month: Date) {
  const first = startOfMonth(month);
  const start = addDays(first, -first.getDay());
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

function eventVariant(type: PlannerEvent["type"], status: string) {
  if (status === "Done" || status === "Completed") return "green";
  if (status === "Missed" || status === "Overdue") return "rose";
  if (type === "PMS") return "blue";
  if (type === "General Visit") return "amber";
  return "slate";
}

function addRuleOccurrences(rule: CustomerVisitRule, month: Date, existingPlanKeys: Set<string>) {
  if (rule.ActiveStatus === "Inactive") return [];
  const frequency = Number(rule.FrequencyDays);
  const start = new Date(`${rule.StartDate}T00:00:00`);
  if (!Number.isFinite(frequency) || frequency < 1 || Number.isNaN(start.getTime())) return [];

  const rangeStart = startOfMonth(month);
  const rangeEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const events: PlannerEvent[] = [];
  let cursor = start;
  while (cursor < rangeStart) cursor = addDays(cursor, frequency);

  while (cursor <= rangeEnd) {
    const date = toDateInputValue(cursor);
    const dedupeKey = `${rule.CustomerID}:${date}:General Visit`;
    if (!existingPlanKeys.has(dedupeKey)) {
      events.push({
        id: `rule-${rule.RuleID}-${date}`,
        source: "rule",
        type: "General Visit",
        date,
        customerId: rule.CustomerID,
        engineerId: rule.AssignedEngineer,
        status: "Planned",
        title: "General Visit",
        detail: rule.Remarks || `Every ${rule.FrequencyDays} days`,
        ruleId: rule.RuleID,
      });
    }
    cursor = addDays(cursor, frequency);
  }

  return events;
}

export function PlannerCalendar({
  customers,
  engineers,
  machines,
  pmsSchedule,
  plannedVisits,
  visitRules,
  tickets,
  canAdmin,
  currentEngineerId,
}: {
  customers: Customer[];
  engineers: Engineer[];
  machines: Machine[];
  pmsSchedule: PMSSchedule[];
  plannedVisits: PlannedVisit[];
  visitRules: CustomerVisitRule[];
  tickets: Ticket[];
  canAdmin: boolean;
  currentEngineerId?: string;
}) {
  const today = new Date();
  const [month, setMonth] = useState(startOfMonth(today));
  const [selectedDate, setSelectedDate] = useState(toDateInputValue(today));
  const [engineerFilter, setEngineerFilter] = useState("");
  const [planCustomer, setPlanCustomer] = useState(customers[0]?.CustomerID ?? "");
  const [planMachine, setPlanMachine] = useState("");
  const [planEngineer, setPlanEngineer] = useState(engineers[0]?.EngineerID ?? "");
  const [planServiceType, setPlanServiceType] = useState("General Visit");
  const [planRemarks, setPlanRemarks] = useState("");
  const [ruleCustomer, setRuleCustomer] = useState(customers[0]?.CustomerID ?? "");
  const [ruleEngineer, setRuleEngineer] = useState("");
  const [ruleFrequency, setRuleFrequency] = useState("30");
  const [ruleStartDate, setRuleStartDate] = useState(toDateInputValue(today));
  const [editingRuleId, setEditingRuleId] = useState("");
  const [editingFrequency, setEditingFrequency] = useState("");
  const [isPending, startTransition] = useTransition();

  const customerById = useMemo(() => new Map(customers.map((customer) => [customer.CustomerID, customer])), [customers]);
  const machineById = useMemo(() => new Map(machines.flatMap((machine) => [[machine.MachineID, machine], [machine.InstallationID ?? "", machine]])), [machines]);
  const visibleEngineerId = canAdmin ? engineerFilter : currentEngineerId ?? "";
  const customerMachines = machines.filter((machine) => machine.CustomerID === planCustomer);

  const events = useMemo(() => {
    const savedPlanKeys = new Set(plannedVisits.map((plan) => `${plan.CustomerID}:${plan.VisitDate}:${plan.PlanType}`));
    const pmsEvents: PlannerEvent[] = pmsSchedule.map((pms) => {
      const machine = machineById.get(pms.MachineID);
      return {
        id: `pms-${pms.PMSID}`,
        source: "pms",
        type: "PMS",
        date: pms.DueDate,
        customerId: pms.CustomerID || machine?.CustomerID || "",
        machineId: pms.MachineID,
        engineerId: pms.AssignedEngineer,
        status: pms.Status,
        title: "PMS",
        detail: machine ? [machine.DeviceName, machine.Model].filter(Boolean).join(" - ") : pms.Remarks || "Scheduled PMS",
        pmsId: pms.PMSID,
        ticketId: pms.TicketID,
      };
    });
    const planEvents: PlannerEvent[] = plannedVisits
      .filter((plan) => !plan.TicketID)
      .map((plan) => ({
        id: `plan-${plan.PlanID}`,
        source: "plan",
        type: "Ticket",
        date: plan.VisitDate,
        customerId: plan.CustomerID,
        machineId: plan.MachineID,
        engineerId: plan.AssignedEngineer,
        status: plan.Status,
        title: "Ticket",
        detail: plan.Remarks || "Planned visit",
        planId: plan.PlanID,
        ticketId: plan.TicketID,
      }));
    const ticketEvents: PlannerEvent[] = tickets
      .filter((ticket) => ticket.VisitDate)
      .map((ticket) => ({
        id: `ticket-${ticket.TicketID}`,
        source: "ticket",
        type: "Ticket",
        date: ticket.VisitDate,
        customerId: ticket.CustomerID,
        machineId: ticket.MachineID,
        engineerId: ticket.AssignedEngineer,
        status: ticket.TicketStatus,
        title: "Ticket",
        detail: ticket.TicketTitle,
        ticketId: ticket.TicketID,
      }));
    const ruleEvents = visitRules.flatMap((rule) => addRuleOccurrences(rule, month, savedPlanKeys));
    return [...pmsEvents, ...planEvents, ...ticketEvents, ...ruleEvents]
      .filter((event) => !visibleEngineerId || event.engineerId === visibleEngineerId)
      .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
  }, [machineById, month, plannedVisits, pmsSchedule, tickets, visibleEngineerId, visitRules]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, PlannerEvent[]>();
    events.forEach((event) => map.set(event.date, [...(map.get(event.date) ?? []), event]));
    return map;
  }, [events]);
  const selectedEvents = eventsByDate.get(selectedDate) ?? [];

  function refresh() {
    window.location.reload();
  }

  async function postJson(url: string, body: object, success: string) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) throw new Error(data?.error || "Could not save");
    toast.success(success);
    refresh();
  }

  async function patchJson(url: string, body: object, success: string) {
    const response = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) throw new Error(data?.error || "Could not update");
    toast.success(success);
    refresh();
  }

  async function deleteJson(url: string, body: object, success: string) {
    const response = await fetch(url, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) throw new Error(data?.error || "Could not delete");
    toast.success(success);
    refresh();
  }

  function createPlan() {
    startTransition(async () => {
      try {
        await postJson(
          "/api/planner/plans",
          {
            CustomerID: planCustomer,
            MachineID: planMachine,
            AssignedEngineer: planEngineer,
            ServiceType: planServiceType,
            VisitDate: selectedDate,
            Remarks: planRemarks,
          },
          "Ticket planned",
        );
      } catch (error) {
        toast.error("Could not add plan", { description: error instanceof Error ? error.message : undefined });
      }
    });
  }

  function createRule() {
    startTransition(async () => {
      try {
        await postJson(
          "/api/planner/rules",
          {
            CustomerID: ruleCustomer,
            FrequencyDays: ruleFrequency,
            AssignedEngineer: ruleEngineer,
            StartDate: ruleStartDate,
          },
          "Visit rule added",
        );
      } catch (error) {
        toast.error("Could not add visit rule", { description: error instanceof Error ? error.message : undefined });
      }
    });
  }

  function updateEvent(event: PlannerEvent, patch: { engineerId?: string; status?: string; date?: string }) {
    startTransition(async () => {
      try {
        if (event.source === "pms") {
          await patchJson("/api/planner/pms", { PMSID: event.pmsId, AssignedEngineer: patch.engineerId, DueDate: patch.date }, "PMS updated");
        } else if (event.source === "plan") {
          await patchJson(
            "/api/planner/plans",
            { PlanID: event.planId, AssignedEngineer: patch.engineerId, Status: patch.status, VisitDate: patch.date },
            "Plan updated",
          );
        } else if (event.source === "ticket") {
          await patchJson(`/api/tickets/${event.ticketId}`, { AssignedEngineer: patch.engineerId }, "Ticket updated");
        } else if (event.source === "rule") {
          await patchJson("/api/planner/rules", { RuleID: event.ruleId, AssignedEngineer: patch.engineerId }, "Visit rule updated");
        }
      } catch (error) {
        toast.error("Could not update planner", { description: error instanceof Error ? error.message : undefined });
      }
    });
  }

  function startRuleEdit(rule: CustomerVisitRule) {
    setEditingRuleId(rule.RuleID);
    setEditingFrequency(rule.FrequencyDays);
  }

  function updateRuleFrequency(ruleId: string) {
    startTransition(async () => {
      try {
        await patchJson("/api/planner/rules", { RuleID: ruleId, FrequencyDays: editingFrequency }, "Visit frequency updated");
      } catch (error) {
        toast.error("Could not update visit frequency", { description: error instanceof Error ? error.message : undefined });
      }
    });
  }

  function deleteRule(ruleId: string) {
    startTransition(async () => {
      try {
        await deleteJson("/api/planner/rules", { RuleID: ruleId }, "Visit rule deleted");
      } catch (error) {
        toast.error("Could not delete visit rule", { description: error instanceof Error ? error.message : undefined });
      }
    });
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
      <div className="space-y-4">
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Calendar Planner</CardTitle>
              <p className="text-sm text-slate-500">{new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(month)}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {canAdmin ? (
                <SelectNative value={engineerFilter} onChange={(event) => setEngineerFilter(event.target.value)} className="w-48">
                  <option value="">All engineers</option>
                  {engineers.map((engineer) => (
                    <option key={engineer.EngineerID} value={engineer.EngineerID}>
                      {engineer.EngineerName}
                    </option>
                  ))}
                </SelectNative>
              ) : null}
              <Button type="button" variant="secondary" size="sm" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
                <ChevronLeft className="size-4" />
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => setMonth(startOfMonth(today))}>
                Today
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 border-l border-t border-slate-200 text-center text-xs font-semibold uppercase text-slate-500">
              {weekDays.map((day, index) => (
                <div key={day} className={cn("border-b border-r border-slate-200 bg-slate-50 px-2 py-2", (index === 0 || index === 6) && "bg-rose-50/70 text-rose-700")}>
                  {day}
                </div>
              ))}
              {calendarDays(month).map((date) => {
                const key = toDateInputValue(date);
                const dayEvents = eventsByDate.get(key) ?? [];
                const isCurrentMonth = monthKey(date) === monthKey(month);
                const isSelected = key === selectedDate;
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedDate(key)}
                    className={cn(
                      "min-h-28 border-b border-r border-slate-200 bg-white p-2 text-left align-top transition hover:bg-[#f4fbff]",
                      isWeekend && "bg-rose-50/30 hover:bg-rose-50/50",
                      !isCurrentMonth && "bg-slate-50 text-slate-400",
                      isSelected && "ring-2 ring-inset ring-sky-400",
                    )}
                  >
                    <span className="text-sm font-semibold">{date.getDate()}</span>
                    <div className="mt-2 space-y-1">
                      {dayEvents.slice(0, 3).map((event) => (
                        <span key={event.id} className="block truncate rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700">
                          {event.title} - {customerById.get(event.customerId)?.HospitalName ?? "Customer"}
                        </span>
                      ))}
                      {dayEvents.length > 3 ? <span className="block text-[11px] font-semibold text-slate-500">+{dayEvents.length - 3} more</span> : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {canAdmin ? (
          <Card>
            <CardHeader>
              <CardTitle>Regular Visit Rules</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 md:grid-cols-[1fr_130px_1fr_140px_auto]">
                <SelectNative value={ruleCustomer} onChange={(event) => setRuleCustomer(event.target.value)}>
                  {customers.map((customer) => (
                    <option key={customer.CustomerID} value={customer.CustomerID}>
                      {customer.HospitalName}
                    </option>
                  ))}
                </SelectNative>
                <Input type="number" min="1" value={ruleFrequency} onChange={(event) => setRuleFrequency(event.target.value)} aria-label="Visit frequency" />
                <SelectNative value={ruleEngineer} onChange={(event) => setRuleEngineer(event.target.value)}>
                  <option value="">Unassigned</option>
                  {engineers.map((engineer) => (
                    <option key={engineer.EngineerID} value={engineer.EngineerID}>
                      {engineer.EngineerName}
                    </option>
                  ))}
                </SelectNative>
                <Input type="date" value={ruleStartDate} onChange={(event) => setRuleStartDate(event.target.value)} aria-label="Start date" />
                <Button type="button" onClick={createRule} disabled={isPending}>
                  <Plus className="size-4" />
                  Add
                </Button>
              </div>
              <div className="overflow-hidden rounded-md border border-slate-200">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Name of Customer</th>
                      <th className="px-3 py-2">Visit Frequency</th>
                      <th className="px-3 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visitRules.map((rule) => (
                      <tr key={rule.RuleID} className="border-t border-slate-100">
                        <td className="px-3 py-2 font-medium text-slate-900">{customerById.get(rule.CustomerID)?.HospitalName ?? "Customer not linked"}</td>
                        <td className="px-3 py-2 text-slate-600">
                          {editingRuleId === rule.RuleID ? (
                            <Input
                              type="number"
                              min="1"
                              value={editingFrequency}
                              onChange={(event) => setEditingFrequency(event.target.value)}
                              className="h-9 w-28"
                              aria-label="Edit visit frequency"
                            />
                          ) : (
                            <>Every {rule.FrequencyDays} days</>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex justify-end gap-2">
                            {editingRuleId === rule.RuleID ? (
                              <>
                                <Button type="button" size="sm" onClick={() => updateRuleFrequency(rule.RuleID)} disabled={isPending}>
                                  <Save className="size-4" />
                                  Save
                                </Button>
                                <Button type="button" variant="secondary" size="sm" onClick={() => setEditingRuleId("")} disabled={isPending}>
                                  <X className="size-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button type="button" variant="secondary" size="sm" onClick={() => startRuleEdit(rule)} disabled={isPending}>
                                  <Pencil className="size-4" />
                                  Edit
                                </Button>
                                <Button type="button" variant="destructive" size="sm" onClick={() => deleteRule(rule.RuleID)} disabled={isPending}>
                                  <Trash2 className="size-4" />
                                  Delete
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!visitRules.length ? (
                      <tr>
                        <td colSpan={3} className="px-3 py-6 text-center text-sm text-slate-500">
                          No regular visit rules yet.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <aside className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>{formatDate(selectedDate)}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedEvents.map((event) => (
              <div key={event.id} className="rounded-md border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Badge variant={eventVariant(event.type, event.status)}>{event.type}</Badge>
                    <p className="mt-2 font-semibold text-slate-950">{customerById.get(event.customerId)?.HospitalName ?? "Customer not linked"}</p>
                    <p className="text-sm text-slate-500">{event.detail}</p>
                  </div>
                  {event.ticketId ? (
                    <Button asChild variant="secondary" size="sm">
                      <Link href={`/tickets/${event.ticketId}`}>Open</Link>
                    </Button>
                  ) : null}
                </div>
                <div className="mt-3 grid gap-2">
                  <SelectNative
                    value={event.engineerId}
                    onChange={(change) => updateEvent(event, { engineerId: change.target.value })}
                    disabled={!canAdmin || isPending}
                  >
                    <option value="">Unassigned</option>
                    {engineers.map((engineer) => (
                      <option key={engineer.EngineerID} value={engineer.EngineerID}>
                        {engineer.EngineerName}
                      </option>
                    ))}
                  </SelectNative>
                  {event.source === "plan" ? (
                    <SelectNative value={event.status} onChange={(change) => updateEvent(event, { status: change.target.value })} disabled={isPending}>
                      {planStatuses.map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                    </SelectNative>
                  ) : null}
                </div>
              </div>
            ))}
            {!selectedEvents.length ? <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-500">No planner tasks on this date.</p> : null}
          </CardContent>
        </Card>

        {canAdmin ? (
          <Card>
            <CardHeader>
              <CardTitle>Add Ticket Plan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
              <SelectNative value={planCustomer} onChange={(event) => {
                setPlanCustomer(event.target.value);
                setPlanMachine("");
              }}>
                {customers.map((customer) => (
                  <option key={customer.CustomerID} value={customer.CustomerID}>
                    {customer.HospitalName}
                  </option>
                ))}
              </SelectNative>
              <SelectNative value={planMachine} onChange={(event) => setPlanMachine(event.target.value)}>
                <option value="">No device linked</option>
                {customerMachines.map((machine) => (
                  <option key={machine.MachineID} value={machine.MachineID}>
                    {[machine.DeviceName, machine.Model, machine.SerialNumber].filter(Boolean).join(" - ")}
                  </option>
                ))}
              </SelectNative>
              <SelectNative value={planEngineer} onChange={(event) => setPlanEngineer(event.target.value)}>
                <option value="">Assign engineer</option>
                {engineers.map((engineer) => (
                  <option key={engineer.EngineerID} value={engineer.EngineerID}>
                    {engineer.EngineerName}
                  </option>
                ))}
              </SelectNative>
              <SelectNative value={planServiceType} onChange={(event) => setPlanServiceType(event.target.value)}>
                {serviceTypes.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </SelectNative>
              <Textarea value={planRemarks} onChange={(event) => setPlanRemarks(event.target.value)} placeholder="Remarks" />
              <Button type="button" onClick={createPlan} disabled={isPending} className="w-full justify-center">
                <Save className="size-4" />
                Save ticket plan
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Month Load</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-md bg-slate-50 p-3">
              <p className="text-slate-500">PMS</p>
              <p className="text-xl font-semibold text-slate-950">{events.filter((event) => event.type === "PMS").length}</p>
            </div>
            <div className="rounded-md bg-slate-50 p-3">
              <p className="text-slate-500">General</p>
              <p className="text-xl font-semibold text-slate-950">{events.filter((event) => event.type === "General Visit").length}</p>
            </div>
            <div className="rounded-md bg-slate-50 p-3">
              <p className="text-slate-500">Tickets</p>
              <p className="text-xl font-semibold text-slate-950">{events.filter((event) => event.type === "Ticket").length}</p>
            </div>
            <div className="rounded-md bg-slate-50 p-3">
              <p className="text-slate-500">Selected</p>
              <p className="text-xl font-semibold text-slate-950">{selectedEvents.length}</p>
            </div>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
