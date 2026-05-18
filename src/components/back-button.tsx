"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BackButton({ fallback = "/tickets" }: { fallback?: string }) {
  const router = useRouter();

  return (
    <Button type="button" variant="secondary" onClick={() => (window.history.length > 1 ? router.back() : router.push(fallback))}>
      <ArrowLeft className="size-4" />
      Back
    </Button>
  );
}
