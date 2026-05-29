import { Badge } from "@/components/ui/badge";
import type { ContractType, TicketStatus } from "@/types/service";

export function StatusBadge({ status }: { status: TicketStatus | string }) {
  const normalized = status === "Closed" || status === "Resolved" || status === "Done" ? "Closed" : "Pending";
  const variant = normalized === "Closed" ? "green" : "amber";
  return <Badge variant={variant}>{status === "Done" ? "Done" : normalized}</Badge>;
}

export function ContractBadge({ contract }: { contract: ContractType | string }) {
  const variant = contract.includes("Warranty") ? "green" : contract.includes("AMC") || contract === "CMC" ? "blue" : "slate";
  return <Badge variant={variant}>{contract}</Badge>;
}
