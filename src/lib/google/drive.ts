import "server-only";

import { Readable } from "node:stream";
import { google } from "googleapis";

function hasDriveConfig() {
  return Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_PRIVATE_KEY &&
      process.env.GOOGLE_DRIVE_FOLDER_ID,
  );
}

function privateKey() {
  return process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
}

async function driveClient() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey(),
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  return google.drive({ version: "v3", auth });
}

export const driveService = {
  isConfigured: hasDriveConfig,
  async uploadFile(file: File, folder = process.env.GOOGLE_DRIVE_FOLDER_ID) {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (!hasDriveConfig() || !folder) {
      return {
        id: `local-${Date.now()}`,
        name: file.name,
        url: `/uploads/${encodeURIComponent(file.name)}`,
        webViewLink: "",
      };
    }

    const drive = await driveClient();
    const response = await drive.files.create({
      requestBody: {
        name: `${Date.now()}-${file.name}`,
        parents: [folder],
      },
      media: {
        mimeType: file.type || "application/octet-stream",
        body: Readable.from(buffer),
      },
      fields: "id,name,webViewLink,webContentLink",
    });

    if (response.data.id && process.env.GOOGLE_DRIVE_PUBLIC_UPLOADS === "true") {
      await drive.permissions.create({
        fileId: response.data.id,
        requestBody: { type: "anyone", role: "reader" },
      });
    }

    return {
      id: response.data.id ?? "",
      name: response.data.name ?? file.name,
      url: response.data.webViewLink ?? response.data.webContentLink ?? "",
      webViewLink: response.data.webViewLink ?? "",
    };
  },
};
