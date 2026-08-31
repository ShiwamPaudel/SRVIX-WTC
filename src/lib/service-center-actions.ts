"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import { auth } from "@/auth";
import {
  SERVICE_CENTER_DEPLOYED_STATUS,
  SERVICE_CENTER_REPAIRED_STATUS,
  SERVICE_CENTER_STATUS,
  isOpenServiceCenterMovement,
} from "@/lib/service-center";
import { isAdmin } from "@/lib/permissions";
import { dataService } from "@/lib/turso/service";
import { uniqueCompactId } from "@/lib/utils";
import type { ServiceCenterMovement, ServiceCenterTask } from "@/types/service";

function formValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function requireUser(session: Session | null) {
  if (!session?.user) throw new Error("Unauthorized");
  return session.user;
}

function requireAdmin(session: Session | null) {
  const user = requireUser(session);
  if (!isAdmin(user.role)) throw new Error("Admin access required");
  return user;
}

export async function returnMachineToServiceCenter(formData: FormData) {
  const session = await auth();
  const user = requireAdmin(session);
  const installationId = formValue(formData, "installationId");
  if (!installationId) throw new Error("Machine is required");

  const [machines, customers, movements] = await Promise.all([
    dataService.machines(),
    dataService.customers(),
    dataService.serviceCenterMovements(),
  ]);
  const machine = machines.find((item) => item.MachineID === installationId || item.InstallationID === installationId);
  if (!machine?.InstallationID) throw new Error("Machine not found");
  const existingOpen = movements.find((movement) => movement.InstallationID === machine.InstallationID && isOpenServiceCenterMovement(movement));
  if (!existingOpen) {
    const customer = customers.find((item) => item.CustomerID === machine.CustomerID);
    const now = new Date().toISOString();
    const movement: ServiceCenterMovement = {
      MovementID: uniqueCompactId("SCM", movements.map((item) => item.MovementID)),
      InstallationID: machine.InstallationID,
      FromCustomerID: machine.CustomerID,
      FromCustomerName: customer?.HospitalName || machine.NameOfCustomer || "",
      FromDepartment: machine.Department ?? "",
      ReceivedAt: now,
      ReceivedBy: user.name ?? user.email ?? "Admin",
      Status: SERVICE_CENTER_STATUS,
      ToCustomerID: "",
      ToCustomerName: "",
      ToDepartment: "",
      ClosedAt: "",
      Remarks: formValue(formData, "remarks"),
    };
    await dataService.createServiceCenterMovement(movement);
    await dataService.updateInstallation(machine.InstallationID, { Status: SERVICE_CENTER_STATUS });
  }

  revalidatePath("/machines");
  revalidatePath(`/machines/${installationId}`);
  revalidatePath("/service-center");
  redirect("/service-center");
}

export async function createServiceCenterTask(formData: FormData) {
  const session = await auth();
  const user = requireUser(session);
  const engineerId = user.engineerId ?? "";
  if (!engineerId) throw new Error("Engineer profile is required");

  const movementId = formValue(formData, "movementId");
  const installationId = formValue(formData, "installationId");
  const title = formValue(formData, "title") || "Service center work";
  if (!movementId || !installationId) throw new Error("Service-center machine is required");

  const [movements, tasks, engineers] = await Promise.all([
    dataService.serviceCenterMovements(),
    dataService.serviceCenterTasks(),
    dataService.engineers(),
  ]);
  const movement = movements.find((item) => item.MovementID === movementId && item.InstallationID === installationId);
  if (!movement || !isOpenServiceCenterMovement(movement)) throw new Error("Service-center record not found");
  const engineer = engineers.find((item) => item.EngineerID === engineerId);
  const now = new Date().toISOString();
  const task: ServiceCenterTask = {
    TaskID: uniqueCompactId("SCT", tasks.map((item) => item.TaskID)),
    MovementID: movement.MovementID,
    InstallationID: installationId,
    EngineerID: engineerId,
    EngineerName: engineer?.EngineerName || user.name || "",
    Title: title.slice(0, 160),
    Remarks: formValue(formData, "remarks").slice(0, 1000),
    Status: "Open",
    CreatedAt: now,
    ClosedAt: "",
    ClosedRemarks: "",
  };

  await dataService.createServiceCenterTask(task);
  revalidatePath("/service-center");
}

export async function closeServiceCenterTask(formData: FormData) {
  const session = await auth();
  const user = requireUser(session);
  const taskId = formValue(formData, "taskId");
  if (!taskId) throw new Error("Task is required");

  const task = (await dataService.serviceCenterTasks()).find((item) => item.TaskID === taskId);
  if (!task) throw new Error("Task not found");
  if (!isAdmin(user.role) && (!user.engineerId || user.engineerId !== task.EngineerID)) {
    throw new Error("Only the assigned engineer can close this task");
  }
  if (task.Status !== "Closed") {
    await dataService.updateServiceCenterTask(task.TaskID, {
      Status: "Closed",
      ClosedAt: new Date().toISOString(),
      ClosedRemarks: formValue(formData, "closedRemarks").slice(0, 1000),
    });
  }

  revalidatePath("/service-center");
  revalidatePath("/attendance");
}

export async function markServiceCenterRepaired(formData: FormData) {
  const session = await auth();
  requireAdmin(session);
  const movementId = formValue(formData, "movementId");
  if (!movementId) throw new Error("Service-center record is required");
  await dataService.updateServiceCenterMovement(movementId, { Status: SERVICE_CENTER_REPAIRED_STATUS });
  revalidatePath("/service-center");
}

export async function deployServiceCenterMachine(formData: FormData) {
  const session = await auth();
  requireAdmin(session);
  const movementId = formValue(formData, "movementId");
  const customerId = formValue(formData, "customerId");
  const department = formValue(formData, "department");
  if (!movementId || !customerId) throw new Error("Customer and service-center record are required");

  const [movements, customers, pmsSchedule] = await Promise.all([
    dataService.serviceCenterMovements(),
    dataService.customers(),
    dataService.pmsSchedule(),
  ]);
  const movement = movements.find((item) => item.MovementID === movementId);
  const customer = customers.find((item) => item.CustomerID === customerId);
  if (!movement || !isOpenServiceCenterMovement(movement)) throw new Error("Service-center record not found");
  if (movement.Status !== SERVICE_CENTER_REPAIRED_STATUS) throw new Error("Mark the machine repaired before deployment");
  if (!customer) throw new Error("Customer not found");

  const name = customer.NameOfCustomer || customer.HospitalName || "";
  const now = new Date().toISOString();
  await dataService.updateInstallation(movement.InstallationID, {
    CustomerID: customer.CustomerID,
    NameOfCustomer: name,
    Department: department,
    Status: "Operational",
  });
  await dataService.updateServiceCenterMovement(movement.MovementID, {
    Status: SERVICE_CENTER_DEPLOYED_STATUS,
    ToCustomerID: customer.CustomerID,
    ToCustomerName: customer.HospitalName || name,
    ToDepartment: department,
    ClosedAt: now,
  });
  await Promise.all(
    pmsSchedule
      .filter((pms) => pms.MachineID === movement.InstallationID && pms.Status !== "Completed")
      .map((pms) => dataService.updatePMSSchedule(pms.PMSID, { CustomerID: customer.CustomerID })),
  );

  revalidatePath("/service-center");
  revalidatePath("/machines");
  revalidatePath(`/machines/${movement.InstallationID}`);
  revalidatePath("/planner");
  revalidatePath("/pms");
}
