import "server-only";

import { isEngineerResigned } from "@/lib/engineers";
import { dataService } from "@/lib/turso/service";

/**
 * Returns an error message when `engineerId` belongs to a resigned engineer, otherwise "".
 * Callers only run this for a *new* assignment, so existing records that still point at a
 * resigned engineer stay editable.
 */
export async function resignedEngineerError(engineerId?: string) {
  const id = (engineerId ?? "").trim();
  if (!id) return "";

  const engineer = (await dataService.engineers()).find((item) => item.EngineerID === id);
  if (!engineer || !isEngineerResigned(engineer)) return "";
  return `${engineer.EngineerName} has resigned and cannot take new work. Assign an active engineer.`;
}
