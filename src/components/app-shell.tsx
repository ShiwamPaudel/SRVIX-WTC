import Link from "next/link";
import { redirect } from "next/navigation";
import Image from "next/image";
import { auth, signOut } from "@/auth";
import {
  Activity,
  BarChart3,
  CalendarCheck,
  Cpu,
  FileText,
  LayoutDashboard,
  LogOut,
  MapPinned,
  Ticket,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tickets", label: "Tickets", icon: Ticket },
  { href: "/machines", label: "Machines", icon: Cpu },
  { href: "/contracts", label: "Contracts", icon: FileText },
  { href: "/engineer", label: "Engineer Panel", icon: Activity },
  { href: "/engineers", label: "Engineers", icon: Users },
  { href: "/pms", label: "PMS", icon: CalendarCheck },
  { href: "/maps", label: "Live Map", icon: MapPinned },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[272px_1fr]">
      <aside className="hidden border-r border-[#111530] bg-[#00000c] text-white lg:block">
        <div className="sticky top-0 flex h-screen flex-col">
          <div className="border-b border-white/10 p-5">
            <div className="flex items-center gap-3">
              <div className="grid size-12 place-items-center rounded-md bg-white">
                <Image src="/Logo - SRVIX.png" alt="SRVIX" width={38} height={38} className="h-9 w-9 object-contain" />
              </div>
              <div>
                <p className="text-sm text-[#9edcff]">SRVIX</p>
                <h1 className="text-lg font-semibold">WTC Service</h1>
              </div>
            </div>
          </div>
          <nav className="flex-1 space-y-1 p-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="border-t border-white/10 p-4">
            <div className="mb-3 rounded-md bg-white/10 p-3">
              <p className="text-sm font-medium">{session.user.name}</p>
              <p className="text-xs text-slate-300">{session.user.role}</p>
            </div>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <Button className="w-full justify-start" variant="ghost">
                <LogOut className="size-4" />
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-[#00000c] lg:hidden">
              <Image src="/Logo - SRVIX.png" alt="SRVIX" width={24} height={24} className="size-6 object-contain" />
              SRVIX
            </Link>
            <div className="hidden lg:block">
              <p className="text-sm text-slate-500">Web Trading Concern Pvt. Ltd.</p>
              <p className="font-semibold text-[#00000c]">SRVIX operational command center</p>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              {navItems.slice(0, 5).map((item) => (
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
            </div>
          </div>
        </header>
        <main className="px-4 py-5 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
