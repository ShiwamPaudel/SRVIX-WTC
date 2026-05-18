import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-[#00000c] shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#38b6ff] focus:ring-2 focus:ring-[#38b6ff]/20",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
