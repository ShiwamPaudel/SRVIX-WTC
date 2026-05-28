import "server-only";

import type { ReportStorageContext, StoredFile } from "@/lib/storage/types";
import { zohoWorkDriveService } from "@/lib/zoho/workdrive";

export const storageService = {
  isConfigured() {
    return zohoWorkDriveService.isConfigured();
  },
  async uploadFile(file: File, context?: ReportStorageContext): Promise<StoredFile> {
    if (zohoWorkDriveService.isConfigured()) {
      return zohoWorkDriveService.uploadFile(file, context);
    }

    throw new Error("Zoho WorkDrive is not configured. Configure the Zoho WorkDrive env vars in Vercel.");
  },
};
