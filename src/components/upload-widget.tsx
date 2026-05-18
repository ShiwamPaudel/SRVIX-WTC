"use client";

import { useState } from "react";
import imageCompression from "browser-image-compression";
import { Camera, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function UploadWidget({ onUploaded }: { onUploaded?: (urls: string[]) => void }) {
  const [urls, setUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function onChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    setLoading(true);
    const uploaded: string[] = [];

    try {
      for (const file of files) {
        const compressed = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1800, useWebWorker: true });
        const body = new FormData();
        body.append("file", compressed, file.name);
        const response = await fetch("/api/upload", { method: "POST", body });
        if (!response.ok) throw new Error("Upload failed");
        const data = (await response.json()) as { url: string };
        uploaded.push(data.url);
      }
      const next = [...urls, ...uploaded];
      setUrls(next);
      onUploaded?.(next);
      toast.success("Images uploaded");
    } catch {
      toast.error("Upload failed", { description: "Check Drive credentials or try a smaller image." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium text-slate-950">Service photos</p>
          <p className="text-sm text-slate-500">Before, after, installation, and diagnostic photos.</p>
        </div>
        <label>
          <input className="sr-only" type="file" accept="image/*" capture="environment" multiple onChange={onChange} />
          <span className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-medium text-white">
            {loading ? <UploadCloud className="size-4 animate-pulse" /> : <Camera className="size-4" />}
            {loading ? "Uploading..." : "Capture / Upload"}
          </span>
        </label>
      </div>
      {urls.length ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {urls.map((url) => (
            <div key={url} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm">
              <a className="truncate text-sky-700" href={url} target="_blank" rel="noreferrer">
                {url}
              </a>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  const next = urls.filter((item) => item !== url);
                  setUrls(next);
                  onUploaded?.(next);
                }}
              >
                <X className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
