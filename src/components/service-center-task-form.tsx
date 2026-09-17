"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus, Wrench, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createServiceCenterTask } from "@/lib/service-center-actions";

function SubmitTaskButton() {
  const { pending } = useFormStatus();
  return (
    <Button size="sm" className="w-full justify-center" disabled={pending}>
      <Wrench className="size-4" />
      {pending ? "Adding task..." : "Add task"}
    </Button>
  );
}

export function ServiceCenterTaskForm({
  movementId,
  installationId,
  buttonLabel = "Add Task",
  buttonClassName,
}: {
  movementId: string;
  installationId: string;
  buttonLabel?: string;
  buttonClassName?: string;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button type="button" variant="secondary" size="sm" className={buttonClassName} onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        {buttonLabel}
      </Button>
    );
  }

  return (
    <form action={createServiceCenterTask} className="space-y-3 rounded-md border border-slate-200 p-3 text-left">
      <input type="hidden" name="movementId" value={movementId} />
      <input type="hidden" name="installationId" value={installationId} />
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 font-semibold text-slate-950">
          <Wrench className="size-4 text-sky-600" />
          New service center task
        </span>
        <Button type="button" variant="ghost" size="icon" aria-label="Cancel task" onClick={() => setOpen(false)}>
          <X className="size-4" />
        </Button>
      </div>
      <Input name="title" placeholder="Task title" maxLength={160} required />
      <Textarea name="remarks" placeholder="Optional notes" maxLength={1000} />
      <SubmitTaskButton />
    </form>
  );
}
