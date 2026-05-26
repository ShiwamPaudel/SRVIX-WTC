import "server-only";

import type { ReportStorageContext, StoredFile, StorageProvider } from "@/lib/storage/types";

type ZohoDataResponse = {
  data?: {
    id?: string;
    links?: Record<string, string | { href?: string }>;
    attributes?: Record<string, unknown>;
  } | Array<{
    id?: string;
    links?: Record<string, string | { href?: string }>;
    attributes?: Record<string, unknown>;
  }>;
};

let cachedAccessToken: { token: string; expiresAt: number } | undefined;

const dataCenterDomains: Record<string, { accounts: string; api: string }> = {
  com: { accounts: "https://accounts.zoho.com", api: "https://www.zohoapis.com/workdrive" },
  eu: { accounts: "https://accounts.zoho.eu", api: "https://www.zohoapis.eu/workdrive" },
  in: { accounts: "https://accounts.zoho.in", api: "https://www.zohoapis.in/workdrive" },
  au: { accounts: "https://accounts.zoho.com.au", api: "https://www.zohoapis.com.au/workdrive" },
};

function zohoDomains() {
  const dc = (process.env.ZOHO_DATA_CENTER || "com").toLowerCase();
  return dataCenterDomains[dc] ?? dataCenterDomains.com;
}

function configured() {
  return Boolean(
    process.env.ZOHO_CLIENT_ID &&
      process.env.ZOHO_CLIENT_SECRET &&
      process.env.ZOHO_REFRESH_TOKEN &&
      process.env.ZOHO_WORKDRIVE_ROOT_FOLDER_ID,
  );
}

function sanitizeSegment(value?: string, fallback = "Not Set") {
  return (value || fallback)
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120) || fallback;
}

function normalizeResourceId(value?: string) {
  const text = (value ?? "").trim();
  if (!text) return "";

  if (!/^https?:\/\//i.test(text)) return text;

  try {
    const url = new URL(text);
    const segments = url.pathname.split("/").filter(Boolean);
    const foldersIndex = segments.lastIndexOf("folders");
    if (foldersIndex >= 0 && segments[foldersIndex + 1]) return segments[foldersIndex + 1];
    return segments.at(-1) ?? text;
  } catch {
    return text;
  }
}

function dateKey(value?: string) {
  if (!value) return new Date().toISOString().slice(0, 10);
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return value.slice(0, 10);
}

function extensionFor(file: File) {
  const parts = file.name.split(".");
  return parts.length > 1 ? `.${parts.pop()}` : "";
}

function reportFileName(file: File, context?: ReportStorageContext) {
  const date = dateKey(context?.ticketDate);
  const title = sanitizeSegment(context?.ticketTitle || context?.ticketId || file.name.replace(/\.[^.]+$/, ""), "Service Report");
  return `${date} - ${title}${extensionFor(file)}`;
}

function folderPath(context?: ReportStorageContext) {
  const strategy = process.env.ZOHO_WORKDRIVE_FOLDER_STRATEGY || "customer-machine";
  if (strategy === "date") {
    return ["Overall Service Reports", dateKey(context?.ticketDate)];
  }

  return [
    sanitizeSegment(context?.customerName, "Unknown Customer"),
    sanitizeSegment(context?.machineModel, "Unknown Model"),
    sanitizeSegment(context?.machineSerial, "Unknown Machine"),
    dateKey(context?.ticketDate),
  ];
}

function firstData(response: ZohoDataResponse) {
  return Array.isArray(response.data) ? response.data[0] : response.data;
}

function attrString(attributes: Record<string, unknown> | undefined, key: string) {
  const value = attributes?.[key];
  return typeof value === "string" ? value : "";
}

function linkHref(links: Record<string, string | { href?: string }> | undefined, key: string) {
  const value = links?.[key];
  if (typeof value === "string") return value;
  return value?.href ?? "";
}

function resourceIdFromUpload(response: ZohoDataResponse) {
  const item = firstData(response);
  const directId = item?.id || attrString(item?.attributes, "resource_id") || attrString(item?.attributes, "RESOURCE_ID");
  if (directId) return directId;

  const fileInfo = attrString(item?.attributes, "File INFO");
  if (!fileInfo) return "";

  try {
    const parsed = JSON.parse(fileInfo) as { RESOURCE_ID?: string };
    return parsed.RESOURCE_ID ?? "";
  } catch {
    return "";
  }
}

function viewUrlFromUpload(response: ZohoDataResponse) {
  const item = firstData(response);
  const attributes = item?.attributes;
  return (
    attrString(attributes, "permalink") ||
    attrString(attributes, "Permalink") ||
    attrString(attributes, "preview_url") ||
    attrString(attributes, "download_url") ||
    linkHref(item?.links, "self") ||
    linkHref(item?.links, "download") ||
    ""
  );
}

async function zohoAccessToken() {
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 60_000) {
    return cachedAccessToken.token;
  }

  const { accounts } = zohoDomains();
  const params = new URLSearchParams({
    refresh_token: process.env.ZOHO_REFRESH_TOKEN ?? "",
    client_id: process.env.ZOHO_CLIENT_ID ?? "",
    client_secret: process.env.ZOHO_CLIENT_SECRET ?? "",
    grant_type: "refresh_token",
  });

  const response = await fetch(`${accounts}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
  const data = (await response.json()) as { access_token?: string; expires_in?: number; error?: string; error_description?: string };
  if (!response.ok || !data.access_token) throw new Error(data.error_description || data.error || "Zoho token request failed");
  cachedAccessToken = {
    token: data.access_token,
    expiresAt: Date.now() + Math.max(60, data.expires_in ?? 3600) * 1000,
  };
  return data.access_token;
}

async function zohoRequest<T>(path: string, options: RequestInit = {}) {
  const { api } = zohoDomains();
  const token = await zohoAccessToken();
  const response = await fetch(`${api}${path}`, {
    ...options,
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      Accept: "application/vnd.api+json",
      "User-Agent": "SRVIX-WTC/1.0",
      ...(options.headers ?? {}),
    },
  });

  const text = await response.text();
  const data = text ? (JSON.parse(text) as T) : ({} as T);
  if (!response.ok) throw new Error(`Zoho WorkDrive request failed: ${text}`);
  return data;
}

async function findChildFolder(parentId: string, name: string) {
  const response = await zohoRequest<ZohoDataResponse>(`/api/v1/files/${parentId}/files`);
  const items = Array.isArray(response.data) ? response.data : response.data ? [response.data] : [];
  return items.find((item) => {
    const attributes = item.attributes ?? {};
    const itemName = attrString(attributes, "name");
    const resourceType = String(attributes.resource_type ?? attributes.type ?? "").toLowerCase();
    return itemName === name && (resourceType.includes("folder") || resourceType === "1001");
  })?.id;
}

async function createFolder(parentId: string, name: string) {
  const response = await zohoRequest<ZohoDataResponse>("/api/v1/files", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      data: {
        attributes: {
          name,
          parent_id: parentId,
        },
        type: "files",
      },
    }),
  });
  const id = firstData(response)?.id;
  if (!id) throw new Error(`Zoho WorkDrive did not return a folder id for ${name}`);
  return id;
}

async function ensureFolderPath(path: string[]) {
  let parentId = normalizeResourceId(process.env.ZOHO_WORKDRIVE_ROOT_FOLDER_ID);
  for (const segment of path) {
    const name = sanitizeSegment(segment);
    parentId = (await findChildFolder(parentId, name)) ?? (await createFolder(parentId, name));
  }
  return parentId;
}

async function createDownloadLink(resourceId: string, linkName: string) {
  const expiryDays = Number(process.env.ZOHO_WORKDRIVE_LINK_EXPIRY_DAYS || "3650");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + Math.max(1, expiryDays));

  try {
    const response = await zohoRequest<ZohoDataResponse>("/api/v1/links", {
      method: "POST",
      headers: { "Content-Type": "application/vnd.api+json" },
      body: JSON.stringify({
        data: {
          attributes: {
            resource_id: resourceId,
            link_name: linkName,
            link_type: "download",
            request_user_data: false,
            allow_download: true,
            expiration_date: expiresAt.toISOString().slice(0, 10),
          },
          type: "links",
        },
      }),
    });

    const item = firstData(response);
    const downloadUrl =
      attrString(item?.attributes, "download_url") ||
      attrString(item?.attributes, "link") ||
      attrString(item?.attributes, "url") ||
      linkHref(item?.links, "self");
    return downloadUrl ? `${downloadUrl}${downloadUrl.includes("?") ? "&" : "?"}directDownload=True` : "";
  } catch (error) {
    console.warn("Zoho WorkDrive public link creation failed", error);
    return "";
  }
}

export const zohoWorkDriveService: StorageProvider = {
  isConfigured: configured,
  async uploadFile(file: File, context?: ReportStorageContext): Promise<StoredFile> {
    if (!configured()) throw new Error("Zoho WorkDrive is not configured");

    const folderId = await ensureFolderPath(folderPath(context));
    const fileName = reportFileName(file, context);
    const params = new URLSearchParams({
      filename: fileName,
      parent_id: folderId,
      "override-name-exist": "false",
    });
    const body = new FormData();
    body.append("content", file, fileName);

    const response = await zohoRequest<ZohoDataResponse>(`/api/v1/upload?${params.toString()}`, {
      method: "POST",
      body,
    });
    const id = resourceIdFromUpload(response);
    const publicUrl = id ? await createDownloadLink(id, fileName) : "";
    const internalUrl = viewUrlFromUpload(response);

    return {
      id,
      name: fileName,
      url: publicUrl || internalUrl || id,
      webViewLink: publicUrl || internalUrl || id,
    };
  },
};
