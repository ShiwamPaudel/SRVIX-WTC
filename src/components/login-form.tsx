"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { LockKeyhole, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const loginErrors: Record<string, string> = {
  invalid_login_input: "Enter a valid email address and password.",
  user_not_found: "No active user exists with this email.",
  password_mismatch: "The password does not match this account.",
  user_inactive: "This user is marked inactive.",
  password_not_configured: "This user does not have a password set.",
};

// callbackUrl comes from middleware as a relative "/path?query", but NextAuth flows can also set it
// as an absolute URL. Accept either as long as it resolves to this origin, and return it as a
// relative path. Anything cross-origin, unparseable, or protocol-relative ("//host", "/\host")
// falls through to /dashboard so it cannot be used as an open redirect.
function safeCallbackUrl(rawValue: string | null) {
  if (!rawValue || rawValue.startsWith("//") || rawValue.startsWith("/\\")) return "/dashboard";

  try {
    const resolved = new URL(rawValue, window.location.origin);
    if (resolved.origin !== window.location.origin) return "/dashboard";
    return `${resolved.pathname}${resolved.search}`;
  } catch {
    return "/dashboard";
  }
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const formData = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      email: String(formData.get("email")),
      password: String(formData.get("password")),
      redirect: false,
    });
    setLoading(false);

    if (result?.error) {
      toast.error("Login failed", {
        description: result.code ? loginErrors[result.code] ?? "Unable to sign in with these credentials." : "Unable to sign in.",
      });
      return;
    }

    toast.success("Welcome back");
    router.push(safeCallbackUrl(params.get("callbackUrl")));
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Email</span>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input className="pl-9" name="email" type="email" required />
        </div>
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Password</span>
        <div className="relative">
          <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input className="pl-9" name="password" type="password" required />
        </div>
      </label>
      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input className="size-4 rounded border-slate-300" type="checkbox" defaultChecked />
        Remember this device
      </label>
      <Button className="w-full" disabled={loading}>
        {loading ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
