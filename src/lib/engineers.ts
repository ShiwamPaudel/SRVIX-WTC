import type { Engineer } from "@/types/service";

export const ENGINEER_RESIGNED_STATUS = "Resigned";
export const ENGINEER_DEFAULT_STATUS = "Available";
export const ENGINEER_INACTIVE_STATUS = "Inactive";
export const USER_ACTIVE_STATUS = "Active";
export const USER_INACTIVE_STATUS = "Inactive";

type EngineerStatus = Pick<Engineer, "ActiveStatus">;

export function isEngineerResigned(engineer?: EngineerStatus) {
  return engineer?.ActiveStatus === ENGINEER_RESIGNED_STATUS;
}

export function isEngineerActive(engineer?: EngineerStatus) {
  if (!engineer) return false;
  return engineer.ActiveStatus !== ENGINEER_INACTIVE_STATUS && engineer.ActiveStatus !== ENGINEER_RESIGNED_STATUS;
}

/**
 * Engineers who may receive new work. `keepEngineerId` keeps an already assigned engineer in the
 * list even after they resigned, so editing an old record cannot silently drop the assignment.
 */
export function assignableEngineers<T extends Engineer>(engineers: T[], keepEngineerId?: string) {
  return engineers.filter((engineer) => isEngineerActive(engineer) || (keepEngineerId && engineer.EngineerID === keepEngineerId));
}

export function engineerOptionLabel(engineer: Pick<Engineer, "EngineerName" | "ActiveStatus">) {
  return isEngineerResigned(engineer) ? `${engineer.EngineerName} (Resigned)` : engineer.EngineerName;
}
