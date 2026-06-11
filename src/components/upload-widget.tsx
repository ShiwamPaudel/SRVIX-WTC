"use client";

import { useState } from "react";
import imageCompression from "browser-image-compression";
import { Camera, FileUp, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function UploadWidget({
  onUploaded,
  initialUrls = [],
  title = "Service photos",
  description = "Before, after, installation, and diagnostic photos.",
  buttonLabel = "Capture / Upload",
  accept = "image/*,application/pdf",
  maxFileSizeMB,
  uploadContext,
  canRemove = true,
}: {
  onUploaded?: (urls: string[]) => void | Promise<void>;
  initialUrls?: string[];
  title?: string;
  description?: string;
  buttonLabel?: string;
  accept?: string;
  maxFileSizeMB?: number;
  uploadContext?: Record<string, string | undefined>;
  canRemove?: boolean;
}) {
  const [urls, setUrls] = useState<string[]>(initialUrls);
  const [loading, setLoading] = useState(false);

  async function onChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    setLoading(true);
    const uploaded: string[] = [];

    try {
      for (const file of files) {
        const uploadFile = file.type.startsWith("image/")
          ? await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1800, useWebWorker: true })
          : file;
        if (maxFileSizeMB && uploadFile.size >= maxFileSizeMB * 1024 * 1024) {
          throw new Error(`${file.name} must be less than ${maxFileSizeMB} MB.`);
        }
        const body = new FormData();
        body.append("file", uploadFile, file.name);
        Object.entries(uploadContext ?? {}).forEach(([key, value]) => {
          if (value) body.append(key, value);
        });
        const response = await fetch("/api/upload", { method: "POST", body });
        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(data?.error || "Upload failed");
        }
        const data = (await response.json()) as { url: string };
        uploaded.push(data.url);
      }
      const next = [...urls, ...uploaded];
      setUrls(next);
      await onUploaded?.(next);
      toast.success("Files uploaded");
    } catch (error) {
      toast.error("Upload failed", {
        description: error instanceof Error ? error.message : "Check storage credentials or try a smaller file.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium text-slate-950">{title}</p>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
        <label>
          <input className="sr-only" type="file" accept={accept} multiple onChange={onChange} />
          <span className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md bg-[#087fb6] px-4 text-sm font-medium text-white transition hover:bg-[#006da3]">
            {loading ? <UploadCloud className="size-4 animate-pulse" /> : accept.includes("pdf") ? <FileUp className="size-4" /> : <Camera className="size-4" />}
            {loading ? "Uploading..." : buttonLabel}
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
              {canRemove ? (
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
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
