import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Image from "next/image";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
      <section className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <div className="mb-5 flex items-center gap-3">
              <Image src="/Logo - SRVIX.png" alt="SRVIX" width={56} height={56} className="size-14 object-contain" />
              <div className="h-10 w-px bg-slate-200" />
              <Image src="/Logo - WTC.png" alt="Web Trading Concern" width={92} height={48} className="h-12 w-auto object-contain" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-[#00000c]">SRVIX Service Management</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Built for Web Trading Concern Pvt. Ltd. to manage tickets, PMS schedules, engineers, assets, and customer history.
            </p>
          </div>
          <LoginForm />
          <p className="mt-4 text-xs text-slate-500">
            Demo access: admin@wtc.local, manager@wtc.local, or engineer@wtc.local with password demo123.
          </p>
        </div>
      </section>
      <section className="hidden bg-[#00000c] p-8 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="rounded-lg border border-white/10 bg-white/5 p-6">
          <p className="text-sm text-[#9edcff]">SRVIX live operations</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight">Built for fast response and accountable service closure.</h2>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {["Tickets", "PMS", "Tracking"].map((item) => (
            <div key={item} className="rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-medium">{item}</p>
              <p className="mt-2 text-xs text-slate-300">Mobile-ready workflow</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
