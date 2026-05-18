import { Badge } from "@/components/ui/badge";
import type { ContractType, Priority, TicketStatus } from "@/types/service";

export function StatusBadge({ status }: { status: TicketStatus | string }) {
  const normalized = status === "Closed" || status === "Resolved" ? "Closed" : "Pending";
  const variant = normalized === "Closed" ? "green" : "amber";
  return <Badge variant={variant}>{normalized}</Badge>;
}

export function PriorityBadge({ priority }: { priority: Priority | string }) {
  const variant =
    priority === "Critical" ? "rose" : priority === "High" ? "amber" : priority === "Medium" ? "blue" : "slate";
  return <Badge variant={variant}>{priority}</Badge>;
}

export function ContractBadge({ contract }: { contract: ContractType | string }) {
  const variant = contract.includes("Warranty") ? "green" : contract.includes("AMC") || contract === "CMC" ? "blue" : "slate";
  return <Badge variant={variant}>{contract}</Badge>;
}
