import {
  CalendarCheck,
  CalendarDays,
  ClipboardCheck,
  Cpu,
  FileText,
  LayoutDashboard,
  MapPinned,
  Settings,
  Ticket,
  Users,
} from "lucide-react";
import type { UserRole } from "@/types/service";

export const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tickets", label: "Tickets", icon: Ticket },
  { href: "/machines", label: "Machines", icon: Cpu },
  { href: "/planner", label: "Planner", icon: CalendarDays, roles: ["Admin", "Manager", "Engineer"] },
  { href: "/attendance", label: "Attendance", icon: ClipboardCheck },
  { href: "/contracts", label: "Contracts", icon: FileText, roles: ["Admin"] },
  { href: "/engineers", label: "Engineers", icon: Users, roles: ["Admin"] },
  { href: "/pms", label: "PMS", icon: CalendarCheck, roles: ["Admin"] },
  { href: "/maps", label: "Live Map", icon: MapPinned },
  { href: "/settings", label: "Settings", icon: Settings, roles: ["Admin"] },
] satisfies {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: UserRole[];
}[];

export function visibleNavItems(role?: UserRole | null) {
  return navItems.filter((item) => !item.roles || (role && item.roles.includes(role)));
}
