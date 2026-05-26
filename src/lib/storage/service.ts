import "server-only";

import { driveService } from "@/lib/google/drive";
import type { ReportStorageContext, StoredFile } from "@/lib/storage/types";
import { zohoWorkDriveService } from "@/lib/zoho/workdrive";

export const storageService = {
  isConfigured() {
    if (process.env.STORAGE_PROVIDER === "zoho") return zohoWorkDriveService.isConfigured();
    return driveService.isConfigured();
  },
  async uploadFile(file: File, context?: ReportStorageContext): Promise<StoredFile> {
    if (process.env.STORAGE_PROVIDER === "zoho") {
      return zohoWorkDriveService.uploadFile(file, context);
    }

    return driveService.uploadFile(file);
  },
};
