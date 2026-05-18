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
              <Image src="/Logo - SRVIX.png" alt="SRVIX" width={180} height={48} className="h-12 w-auto max-w-[180px] object-contain" />
              <div className="h-10 w-px bg-slate-200" />
              <Image src="/Logo - WTC.png" alt="Web Trading Concern" width={92} height={48} className="h-12 w-auto object-contain" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-[#00000c]">SRVIX</h1>
            <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
              One Stop Tracking : Service | PMS | Warranty | Tickets
            </p>
          </div>
          <LoginForm />
        </div>
      </section>
      <section className="hidden bg-[#f4fbff] p-8 text-[#00000c] lg:flex lg:flex-col lg:justify-between">
        <div className="flex flex-1 items-center justify-center">
          <Image
            src="/srvix-hero.png"
            alt="SRVIX dashboard preview"
            width={1024}
            height={768}
            priority
            className="h-auto w-full max-w-[720px] object-contain"
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {["Tickets", "PMS", "Tracking"].map((item) => (
            <div key={item} className="rounded-lg border border-[#dbeaf3] bg-white p-4">
              <p className="text-sm font-medium">{item}</p>
              <p className="mt-2 text-xs text-slate-500">Mobile-ready workflow</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
