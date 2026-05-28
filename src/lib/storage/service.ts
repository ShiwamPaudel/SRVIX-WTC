import "server-only";

import type { ReportStorageContext, StoredFile } from "@/lib/storage/types";
import { zohoWorkDriveConfigStatus, zohoWorkDriveService } from "@/lib/zoho/workdrive";

export const storageService = {
  isConfigured() {
    return zohoWorkDriveService.isConfigured();
  },
  async uploadFile(file: File, context?: ReportStorageContext): Promise<StoredFile> {
    if (zohoWorkDriveService.isConfigured()) {
      return zohoWorkDriveService.uploadFile(file, context);
    }

    const status = zohoWorkDriveConfigStatus();
    throw new Error(
      status.missing.length
        ? `Zoho WorkDrive is not configured. Missing Vercel env vars: ${status.missing.join(", ")}.`
        : "Zoho WorkDrive is not configured. Redeploy after saving the Vercel env vars.",
    );
  },
};
