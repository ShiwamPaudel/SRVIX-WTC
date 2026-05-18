"use client";

import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Eraser, PenLine, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function SignaturePad({ onSaved }: { onSaved?: (url: string) => void }) {
  const ref = useRef<SignatureCanvas | null>(null);
  const [loading, setLoading] = useState(false);

  async function save() {
    if (!ref.current || ref.current.isEmpty()) {
      toast.error("Signature is empty");
      return;
    }
    setLoading(true);
    try {
      const blob = await new Promise<Blob>((resolve) => ref.current?.getCanvas().toBlob((value) => resolve(value as Blob), "image/png"));
      const body = new FormData();
      body.append("file", blob, `signature-${Date.now()}.png`);
      const response = await fetch("/api/upload", { method: "POST", body });
      if (!response.ok) throw new Error("Upload failed");
      const data = (await response.json()) as { url: string };
      onSaved?.(data.url);
      toast.success("Signature saved");
    } catch {
      toast.error("Could not save signature");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="font-medium text-slate-950">Customer signature</p>
          <p className="text-sm text-slate-500">Capture confirmation on mobile or tablet.</p>
        </div>
        <PenLine className="size-5 text-sky-600" />
      </div>
      <div className="overflow-hidden rounded-md border border-slate-200 bg-slate-50">
        <SignatureCanvas ref={ref} canvasProps={{ className: "h-44 w-full" }} />
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => ref.current?.clear()}>
          <Eraser className="size-4" />
          Clear
        </Button>
        <Button type="button" onClick={save} disabled={loading}>
          <Upload className="size-4" />
          {loading ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}
