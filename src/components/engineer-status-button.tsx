"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ENGINEER_DEFAULT_STATUS, ENGINEER_RESIGNED_STATUS } from "@/lib/engineers";

export function EngineerStatusButton({
  engineerId,
  engineerName,
  resigned,
}: {
  engineerId: string;
  engineerName: string;
  resigned: boolean;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function updateStatus() {
    const confirmed = window.confirm(
      resigned
        ? `Bring ${engineerName} back as an active engineer? Their login will be enabled again.`
        : `Mark ${engineerName} as resigned? Their login is disabled and they stop appearing in assignment lists and the live map. Past tickets and attendance history are kept.`,
    );
    if (!confirmed) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/engineers/${engineerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ActiveStatus: resigned ? ENGINEER_DEFAULT_STATUS : ENGINEER_RESIGNED_STATUS }),
      });
      const data = (await response.json().catch(() => null)) as
        | { error?: string; followUps?: { pendingPms: number; activeRules: number } }
        | null;
      if (!response.ok) throw new Error(data?.error || "Could not update engineer");

      const pendingPms = data?.followUps?.pendingPms ?? 0;
      const activeRules = data?.followUps?.activeRules ?? 0;
      const followUp = [
        pendingPms ? `${pendingPms} upcoming PMS row${pendingPms === 1 ? "" : "s"}` : "",
        activeRules ? `${activeRules} active visit rule${activeRules === 1 ? "" : "s"}` : "",
      ].filter(Boolean);

      toast.success(resigned ? `${engineerName} is active again` : `${engineerName} marked resigned`, {
        description: followUp.length ? `Still assigned to them: ${followUp.join(" and ")}. Reassign from the planner.` : undefined,
      });
      router.refresh();
    } catch (error) {
      toast.error("Could not update engineer", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Button type="button" variant="secondary" size="sm" onClick={updateStatus} disabled={saving} className="w-full justify-center">
      {resigned ? <RotateCcw className="size-4" /> : <UserMinus className="size-4" />}
      {saving ? "Saving..." : resigned ? "Mark as Active" : "Mark as Resigned"}
    </Button>
  );
}
