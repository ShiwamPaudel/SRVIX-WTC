import Link from "next/link";
import { redirect } from "next/navigation";
import Image from "next/image";
import { auth, signOut } from "@/auth";
import {
  ClipboardCheck,
  CalendarCheck,
  Cpu,
  FileText,
  LayoutDashboard,
  LogOut,
  MapPinned,
  Settings,
  UserCircle,
  Ticket,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tickets", label: "Tickets", icon: Ticket },
  { href: "/machines", label: "Machines", icon: Cpu },
  { href: "/attendance", label: "Attendance", icon: ClipboardCheck },
  { href: "/contracts", label: "Contracts", icon: FileText },
  { href: "/engineers", label: "Engineers", icon: Users },
  { href: "/pms", label: "PMS", icon: CalendarCheck },
  { href: "/maps", label: "Live Map", icon: MapPinned },
  { href: "/settings", label: "Settings", icon: Settings, adminOnly: true },
];

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const visibleNavItems = navItems.filter((item) => !item.adminOnly || session.user.role === "Admin");

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[272px_1fr]">
      <aside className="hidden border-r border-[#dbeaf3] bg-[#fffdf7] text-[#00000c] lg:block">
        <div className="sticky top-0 flex h-screen flex-col">
          <div className="border-b border-[#dbeaf3] px-5 py-6">
            <Link href="/dashboard" className="block">
              <Image
                src="/Logo - SRVIX.png"
                alt="SRVIX"
                width={180}
                height={48}
                priority
                className="h-10 w-auto max-w-[190px] object-contain"
              />
            </Link>
          </div>
          <nav className="flex-1 space-y-1 p-4">
            {visibleNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-[#e8f7ff] hover:text-[#00000c]"
              >
                <item.icon className="size-4 text-[#38b6ff]" />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="border-t border-[#dbeaf3] p-4 text-xs text-slate-500">Web Trading Concern Pvt. Ltd.</div>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <Link href="/dashboard" className="flex items-center lg:hidden">
              <Image
                src="/Logo - SRVIX.png"
                alt="SRVIX"
                width={150}
                height={40}
                priority
                className="h-9 w-auto max-w-[150px] object-contain"
              />
            </Link>
            <div className="hidden lg:block" />
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              {visibleNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-2.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 lg:hidden"
                >
                  {item.label}
                </Link>
              ))}
              <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 sm:inline-flex">
                {session.user.role}
              </span>
              <Link
                href="/profile"
                className="hidden items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-[#00000c] hover:bg-[#f7fbff] sm:inline-flex"
              >
                <UserCircle className="size-4 text-[#38b6ff]" />
                {session.user.name ?? "Profile"}
              </Link>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/login" });
                }}
              >
                <Button variant="secondary" size="sm">
                  <LogOut className="size-4" />
                  Sign out
                </Button>
              </form>
            </div>
          </div>
        </header>
        <main className="px-4 py-5 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
