import type { UserRole } from "@/types/service";

export function isAdmin(role?: UserRole | null) {
  return role === "Admin";
}

export function canAccessPath(pathname: string, role?: UserRole | null) {
  if (isAdmin(role)) return true;
  const adminOnlyPaths = [
    "/settings",
    "/engineers",
    "/customers/new",
    "/device-models/new",
    "/machines/new",
    "/tickets/new",
    "/contracts",
    "/pms",
  ];
  return !adminOnlyPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}
