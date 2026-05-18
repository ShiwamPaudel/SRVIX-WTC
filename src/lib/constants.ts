import type { ContractType, Priority, ServiceType, TicketStatus, UserRole } from "@/types/service";

export const serviceTypes: ServiceType[] = [
  "Breakdown (OnSite Addressed)",
  "Breakdown (On Call Addressed)",
  "PMS",
  "Installation",
  "Pre-Installation",
  "Calibration",
  "Demo",
  "Training",
  "Emergency Visit",
];

export const ticketStatuses: TicketStatus[] = ["Pending", "Closed"];

export const priorities: Priority[] = ["Low", "Medium", "High", "Critical"];

export const contractTypes: ContractType[] = [
  "Under Warranty",
  "Under AMC",
  "RRC",
  "Out of Warranty",
  "CMC",
  "Demo Unit",
];

export const roles: UserRole[] = ["Admin", "Manager", "Engineer"];
