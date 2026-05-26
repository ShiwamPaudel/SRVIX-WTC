export type ReportStorageContext = {
  ticketId?: string;
  customerName?: string;
  machineModel?: string;
  machineSerial?: string;
  ticketTitle?: string;
  ticketDate?: string;
};

export type StoredFile = {
  id: string;
  name: string;
  url: string;
  webViewLink?: string;
};

export type StorageProvider = {
  isConfigured: () => boolean;
  uploadFile: (file: File, context?: ReportStorageContext) => Promise<StoredFile>;
};
