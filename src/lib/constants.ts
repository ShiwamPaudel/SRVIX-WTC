import type { ContractType, ServiceType, TicketStatus, UserRole } from "@/types/service";

export const serviceTypes: ServiceType[] = [
  "General Visit",
  "Pre - Installation",
  "Installation",
  "Application Issue",
  "Breakdown (On-site Addressed)",
  "Breakdown (On-call Addressed)",
  "PMS",
];

const serviceReportOptionalTypes = new Set<string>([
  "General Visit",
  "Breakdown (On-call Addressed)",
  "Breakdown (On Call Addressed)",
]);

export function serviceReportRequiredForServiceType(serviceType?: string) {
  return !serviceReportOptionalTypes.has(serviceType ?? "");
}

export const ticketStatuses: TicketStatus[] = ["Pending", "Closed"];

export const contractTypes: ContractType[] = [
  "Under Warranty",
  "Under AMC",
  "RRC",
  "Out of Warranty",
  "CMC",
  "Demo Unit",
];

export const roles: UserRole[] = ["Admin", "Manager", "Engineer"];
