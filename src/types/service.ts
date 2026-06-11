export type UserRole = "Admin" | "Manager" | "Engineer";

export type ContractType =
  | "Under Warranty"
  | "Under AMC"
  | "RRC"
  | "Out of Warranty"
  | "CMC"
  | "Demo Unit";

export type ServiceType =
  | "General Visit"
  | "Pre - Installation"
  | "Installation"
  | "Application Issue"
  | "Breakdown (On-site Addressed)"
  | "Breakdown (On-call Addressed)"
  | "PMS";

export type TicketStatus = "Pending" | "Closed";

export type LeaveRequestStatus = "Pending" | "Approved" | "Rejected";

export type Priority = "Low" | "Medium" | "High" | "Critical";

export type PlannerPlanType = "General Visit" | "Scheduled Visit" | "Ticket";

export type PlannerStatus = "Planned" | "Done" | "Missed" | "Cancelled";

export type Customer = {
  CustomerID: string;
  NameOfCustomer: string;
  Province: string;
  District: string;
  Address: string;
  CustomerType: string;
  HospitalName?: string;
  Department?: string;
  ContactPerson?: string;
  Phone?: string;
  Email?: string;
  Latitude?: string;
  Longitude?: string;
  Remarks?: string;
};

export type DeviceModel = {
  ModelID: string;
  BrandName: string;
  Model: string;
  PMSFrequency: string;
  ImageURL: string;
};

export type Installation = {
  InstallationID: string;
  CustomerID: string;
  NameOfCustomer: string;
  Department: string;
  ModelID: string;
  Model: string;
  BrandName: string;
  SerialNumber: string;
  InstallationDate: string;
  WarrantyYears: string;
  WarrantyExpiry: string;
  Status: string;
  Remarks: string;
  ImageURL: string;
};

export type Machine = {
  MachineID: string;
  CustomerID: string;
  Department?: string;
  DeviceName: string;
  Brand: string;
  Model: string;
  SerialNumber: string;
  InstallationDate: string;
  WarrantyMonths?: string;
  WarrantyExpiry: string;
  ContractType: ContractType;
  ContractStart: string;
  ContractEnd: string;
  PMSFrequency: string;
  PMSIntervalDays?: string;
  LastPMS: string;
  NextPMS: string;
  Status: string;
  Remarks: string;
  ImageURL?: string;
  InstallationID?: string;
  ModelID?: string;
  NameOfCustomer?: string;
  WarrantyYears?: string;
  WarrantyStatus?: string;
};

export type ContractRecord = {
  ContractID: string;
  InstallationID: string;
  NameOfCustomer: string;
  Model: string;
  SerialNumber: string;
  ContractStart: string;
  ContractEnd: string;
  RenewalYears?: string;
  Status: string;
  Remarks: string;
  ContractType: "AMC" | "CMC" | "RRC";
};

export type Engineer = {
  EngineerID: string;
  EngineerName: string;
  "Engineer Name"?: string;
  Phone: string;
  Email: string;
  Department?: string;
  Role?: string;
  ActiveStatus: string;
  LiveLatitude?: string;
  LiveLongitude?: string;
  LastLocationUpdate?: string;
};

export type EngineerLocationLog = {
  LocationLogID: string;
  EngineerID: string;
  EngineerName: string;
  Latitude: string;
  Longitude: string;
  Remarks: string;
  CreatedAt: string;
};

export type Ticket = {
  TicketID: string;
  TicketDate: string;
  Date?: string;
  CustomerID: string;
  NameOfCustomer?: string;
  MachineID: string;
  InstallationID?: string;
  Model?: string;
  TicketTitle: string;
  ProblemDescription: string;
  Description?: string;
  ServiceType: ServiceType;
  Priority: Priority;
  ContractType: ContractType;
  WarrantyStatus?: string;
  AssignedEngineer: string;
  TicketAcceptedAt?: string;
  TicketAcceptedBy?: string;
  AssistedBy: string;
  TicketStatus: TicketStatus;
  ResponseType: string;
  OpenedBy: string;
  EngineerRemarks: string;
  Resolution: string;
  VisitDate: string;
  CompletionDate: string;
  CustomerSignatureURL: string;
  AttachmentURLs: string;
  ClosureStatus: string;
  Latitude: string;
  Longitude: string;
  LastUpdated: string;
  PMSID?: string;
  PMSNumber?: string;
};

export type TicketLog = {
  LogID: string;
  TicketID: string;
  UpdatedBy: string;
  UpdateDate: string;
  Status: TicketStatus;
  Remarks: string;
  AttachmentURL: string;
  Latitude: string;
  Longitude: string;
};

export type PMSSchedule = {
  PMSID: string;
  PMSNumber?: string;
  MachineID: string;
  CustomerID: string;
  DueDate: string;
  AssignedEngineer: string;
  Status: "Due" | "Scheduled" | "Completed" | "Overdue";
  CompletionDate: string;
  Remarks: string;
  TicketID?: string;
};

export type AppUser = {
  UserID: string;
  Name: string;
  Email: string;
  PasswordHash?: string;
  Role: UserRole;
  EngineerID?: string;
  ActiveStatus: string;
};

export type NotificationRecord = {
  NotificationID: string;
  Type: string;
  Recipient: string;
  UserID?: string;
  EngineerID?: string;
  Role?: UserRole | "";
  Subject: string;
  Message: string;
  URL?: string;
  Status: string;
  CreatedAt: string;
  SentAt: string;
  ReadAt?: string;
};

export type LeaveRequest = {
  LeaveRequestID: string;
  EngineerID: string;
  EngineerName: string;
  RequestedByUserID: string;
  LeaveDate: string;
  Reason: string;
  Status: LeaveRequestStatus;
  ReviewedBy: string;
  ReviewReason: string;
  CreatedAt: string;
  ReviewedAt: string;
};

export type PushSubscriptionRecord = {
  SubscriptionID: string;
  UserID: string;
  EngineerID: string;
  Role: UserRole | "";
  Endpoint: string;
  P256DH: string;
  AuthSecret: string;
  UserAgent: string;
  CreatedAt: string;
  LastSeenAt: string;
};

export type PlannedVisit = {
  PlanID: string;
  PlanType: PlannerPlanType;
  CustomerID: string;
  MachineID: string;
  PMSID: string;
  TicketID: string;
  AssignedEngineer: string;
  VisitDate: string;
  Status: PlannerStatus;
  Remarks: string;
  CreatedBy: string;
  CreatedAt: string;
  UpdatedAt: string;
};

export type CustomerVisitRule = {
  RuleID: string;
  CustomerID: string;
  FrequencyDays: string;
  AssignedEngineer: string;
  StartDate: string;
  LastGeneratedDate: string;
  ActiveStatus: string;
  Remarks: string;
  CreatedAt: string;
  UpdatedAt: string;
};

export type TicketWithRelations = Ticket & {
  customer?: Customer;
  machine?: Machine;
  engineer?: Engineer;
  logs?: TicketLog[];
};
