import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", {
  variants: {
    variant: {
      default: "bg-slate-900 text-white",
      blue: "bg-[#e5f7ff] text-[#006da3]",
      green: "bg-emerald-100 text-emerald-800",
      amber: "bg-amber-100 text-amber-800",
      rose: "bg-rose-100 text-rose-800",
      slate: "bg-slate-100 text-slate-700",
    },
  },
  defaultVariants: { variant: "default" },
});

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}
