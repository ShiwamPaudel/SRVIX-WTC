"use client";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock3, Save } from "lucide-react";
import { toast } from "sonner";
import { priorities, serviceTypes, ticketStatuses } from "@/lib/constants";
import { compactId } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { UploadWidget } from "@/components/upload-widget";
import type { Customer, Engineer, Machine, Ticket } from "@/types/service";

const schema = z.object({
  TicketID: z.string().min(1),
  CustomerID: z.string().min(1),
  MachineID: z.string().min(1),
  TicketTitle: z.string().min(3),
  ProblemDescription: z.string().min(5),
  ServiceType: z.string().min(1),
  Priority: z.string().min(1),
  ContractType: z.string().min(1),
  AssignedEngineer: z.string().min(1),
  AssistedBy: z.string().optional(),
  TicketStatus: z.string().min(1),
  VisitDate: z.string().optional(),
  Latitude: z.string().optional(),
  Longitude: z.string().optional(),
  AttachmentURLs: z.string().optional(),
});

type TicketFormValues = z.infer<typeof schema>;

export function TicketForm({
  customers,
  machines,
  engineers,
  ticket,
  canAssign = true,
}: {
  customers: Customer[];
  machines: Machine[];
  engineers: Engineer[];
  ticket?: Ticket;
  canAssign?: boolean;
}) {
  const router = useRouter();
  const [attachments, setAttachments] = useState(ticket?.AttachmentURLs ?? "");
  const form = useForm<TicketFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      TicketID: ticket?.TicketID ?? compactId("TKT"),
      CustomerID: ticket?.CustomerID ?? "",
      MachineID: ticket?.MachineID ?? "",
      TicketTitle: ticket?.TicketTitle ?? "",
      ProblemDescription: ticket?.ProblemDescription ?? "",
      ServiceType: ticket?.ServiceType ?? "Breakdown (OnSite Addressed)",
      Priority: ticket?.Priority ?? "Medium",
      ContractType: ticket?.ContractType ?? "Under Warranty",
      AssignedEngineer: ticket?.AssignedEngineer ?? "",
      AssistedBy: ticket?.AssistedBy ?? "",
      TicketStatus: ticket?.TicketStatus ?? "Pending",
      VisitDate: ticket?.VisitDate ?? new Date().toISOString().slice(0, 10),
      Latitude: ticket?.Latitude ?? "",
      Longitude: ticket?.Longitude ?? "",
      AttachmentURLs: ticket?.AttachmentURLs ?? "",
    },
  });

  const customerId = form.watch("CustomerID");
  const machineId = form.watch("MachineID");
  const ticketStatus = form.watch("TicketStatus");
  const relatedMachines = useMemo(
    () => machines.filter((machine) => !customerId || machine.CustomerID === customerId),
    [customerId, machines],
  );
  const selectedMachine = machines.find((machine) => machine.MachineID === machineId);
  const assignedEngineer = engineers.find((engineer) => engineer.EngineerID === form.watch("AssignedEngineer"));

  useEffect(() => {
    if (selectedMachine && customerId && selectedMachine.CustomerID !== customerId) {
      form.setValue("MachineID", "");
      form.setValue("ContractType", "Out of Warranty");
    }
  }, [customerId, form, selectedMachine]);

  function onMachineChange(machineId: string) {
    form.setValue("MachineID", machineId);
    const machine = machines.find((item) => item.MachineID === machineId);
    if (machine) {
      form.setValue("ContractType", machine.ContractType);
      const customer = customers.find((item) => item.CustomerID === machine.CustomerID);
      if (customer) {
        form.setValue("CustomerID", customer.CustomerID);
        form.setValue("Latitude", customer.Latitude);
        form.setValue("Longitude", customer.Longitude);
      }
    }
  }

  async function onSubmit(values: TicketFormValues) {
    if (values.TicketStatus === "Closed" && !attachments.split(",").map((item) => item.trim()).filter(Boolean).length) {
      toast.error("Attach the service report before closing this ticket");
      return;
    }

    const response = await fetch(ticket ? `/api/tickets/${ticket.TicketID}` : "/api/tickets", {
      method: ticket ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, AttachmentURLs: attachments }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      toast.error("Could not save ticket", {
        description: data?.error,
      });
      return;
    }

    const data = (await response.json()) as { ticket: Ticket };
    toast.success(ticket ? "Ticket updated" : "Ticket created");
    router.push(`/tickets/${data.ticket.TicketID}`);
    router.refresh();
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 xl:grid-cols-[1fr_360px]">
      <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <Input type="hidden" {...form.register("TicketID")} />
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Visit date</span>
            <Input type="date" {...form.register("VisitDate")} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Customer</span>
            <SelectNative {...form.register("CustomerID")}>
              <option value="">Select customer</option>
              {customers.map((customer) => (
                <option key={customer.CustomerID} value={customer.CustomerID}>{customer.HospitalName}</option>
              ))}
            </SelectNative>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Machine</span>
            <SelectNative value={machineId} onChange={(event) => onMachineChange(event.target.value)}>
              <option value="">Select machine</option>
              {relatedMachines.map((machine) => (
                <option key={machine.MachineID} value={machine.MachineID}>
                  {[machine.DeviceName, machine.Department, machine.SerialNumber].filter(Boolean).join(" - ")}
                </option>
              ))}
            </SelectNative>
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-slate-700">Ticket title</span>
            <Input {...form.register("TicketTitle")} placeholder="Short issue summary" />
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-slate-700">Problem description</span>
            <Textarea {...form.register("ProblemDescription")} placeholder="Detailed complaint, alarm, error code, and observed impact" />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Service type</span>
            <SelectNative {...form.register("ServiceType")}>
              {serviceTypes.map((type) => <option key={type}>{type}</option>)}
            </SelectNative>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Priority</span>
            <SelectNative {...form.register("Priority")}>
              {priorities.map((priority) => <option key={priority}>{priority}</option>)}
            </SelectNative>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Contract</span>
            <Input value={selectedMachine?.ContractType ?? form.watch("ContractType")} readOnly />
            <Input type="hidden" {...form.register("ContractType")} />
          </label>
          <div className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Status</span>
            <Input type="hidden" {...form.register("TicketStatus")} />
            <div className="grid grid-cols-2 gap-2 rounded-md border border-slate-200 bg-slate-50 p-1">
              {ticketStatuses.map((status) => {
                const active = ticketStatus === status;
                const Icon = status === "Closed" ? CheckCircle2 : Clock3;
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => form.setValue("TicketStatus", status, { shouldDirty: true, shouldValidate: true })}
                    className={
                      status === "Closed"
                        ? `inline-flex h-9 items-center justify-center gap-2 rounded-md text-sm font-semibold transition ${
                            active ? "bg-emerald-500 text-white shadow-sm" : "text-emerald-700 hover:bg-emerald-50"
                          }`
                        : `inline-flex h-9 items-center justify-center gap-2 rounded-md text-sm font-semibold transition ${
                            active ? "bg-amber-400 text-[#12384f] shadow-sm" : "text-amber-700 hover:bg-amber-50"
                          }`
                    }
                  >
                    <Icon className="size-4" />
                    {status}
                  </button>
                );
              })}
            </div>
          </div>
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Assigned engineer</span>
            {canAssign ? (
              <SelectNative {...form.register("AssignedEngineer")}>
                <option value="">Assign engineer</option>
                {engineers.map((engineer) => (
                  <option key={engineer.EngineerID} value={engineer.EngineerID}>{engineer.EngineerName}</option>
                ))}
              </SelectNative>
            ) : (
              <>
                <Input value={assignedEngineer?.EngineerName ?? "Engineer not assigned"} readOnly />
                <Input type="hidden" {...form.register("AssignedEngineer")} />
              </>
            )}
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Assisted by</span>
            <Input {...form.register("AssistedBy")} placeholder="ENG-02, ENG-03" />
          </label>
          <Input type="hidden" {...form.register("Latitude")} />
          <Input type="hidden" {...form.register("Longitude")} />
        </div>
        {Object.keys(form.formState.errors).length ? (
          <p className="text-sm text-rose-600">Please complete all required ticket fields.</p>
        ) : null}
        <div className="flex justify-end">
          <Button disabled={form.formState.isSubmitting}>
            <Save className="size-4" />
            {form.formState.isSubmitting ? "Saving..." : "Save ticket"}
          </Button>
        </div>
      </div>
      <aside className="space-y-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="font-semibold text-slate-950">Machine context</h3>
          {selectedMachine ? (
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Warranty</dt><dd className="text-slate-900">{selectedMachine.WarrantyExpiry}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Last PMS</dt><dd className="text-slate-900">{selectedMachine.LastPMS}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Next PMS</dt><dd className="text-slate-900">{selectedMachine.NextPMS}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Contract</dt><dd className="text-slate-900">{selectedMachine.ContractType}</dd></div>
            </dl>
          ) : (
            <p className="mt-2 text-sm text-slate-500">Select a customer and machine to auto-fill contract and PMS details.</p>
          )}
        </div>
        <UploadWidget
          initialUrls={attachments.split(",").map((item) => item.trim()).filter(Boolean)}
          uploadContext={ticket ? { ticketId: ticket.TicketID } : undefined}
          onUploaded={(urls) => setAttachments(urls.join(", "))}
        />
      </aside>
    </form>
  );
}
