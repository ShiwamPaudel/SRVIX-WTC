import type { Machine, ServiceCenterMovement, ServiceCenterTask } from "@/types/service";

export const SERVICE_CENTER_STATUS = "In Service Center";
export const SERVICE_CENTER_REPAIRED_STATUS = "Repaired";
export const SERVICE_CENTER_DEPLOYED_STATUS = "Deployed";

export function machineLabel(machine?: Pick<Machine, "DeviceName" | "Model" | "SerialNumber">) {
  if (!machine) return "Machine";
  return [machine.DeviceName, machine.Model, machine.SerialNumber].filter(Boolean).join(" - ") || "Machine";
}

export function isOpenServiceCenterMovement(movement: ServiceCenterMovement) {
  return movement.Status !== SERVICE_CENTER_DEPLOYED_STATUS && !movement.ClosedAt;
}

export function latestOpenMovementByInstallation(movements: ServiceCenterMovement[]) {
  return movements
    .filter(isOpenServiceCenterMovement)
    .sort((a, b) => b.ReceivedAt.localeCompare(a.ReceivedAt))
    .reduce<Map<string, ServiceCenterMovement>>((grouped, movement) => {
      if (!grouped.has(movement.InstallationID)) grouped.set(movement.InstallationID, movement);
      return grouped;
    }, new Map());
}

export function tasksByMovement(tasks: ServiceCenterTask[]) {
  return tasks.reduce<Map<string, ServiceCenterTask[]>>((grouped, task) => {
    const group = grouped.get(task.MovementID) ?? [];
    group.push(task);
    grouped.set(task.MovementID, group);
    return grouped;
  }, new Map());
}
