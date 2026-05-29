PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS customers (
  CustomerID TEXT PRIMARY KEY,
  NameOfCustomer TEXT NOT NULL DEFAULT '',
  Province TEXT NOT NULL DEFAULT '',
  District TEXT NOT NULL DEFAULT '',
  Address TEXT NOT NULL DEFAULT '',
  CustomerType TEXT NOT NULL DEFAULT '',
  HospitalName TEXT NOT NULL DEFAULT '',
  Department TEXT NOT NULL DEFAULT '',
  ContactPerson TEXT NOT NULL DEFAULT '',
  Phone TEXT NOT NULL DEFAULT '',
  Email TEXT NOT NULL DEFAULT '',
  Latitude TEXT NOT NULL DEFAULT '',
  Longitude TEXT NOT NULL DEFAULT '',
  Remarks TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS device_models (
  ModelID TEXT PRIMARY KEY,
  BrandName TEXT NOT NULL DEFAULT '',
  Model TEXT NOT NULL DEFAULT '',
  PMSFrequency TEXT NOT NULL DEFAULT '',
  ImageURL TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS installations (
  InstallationID TEXT PRIMARY KEY,
  CustomerID TEXT NOT NULL DEFAULT '',
  NameOfCustomer TEXT NOT NULL DEFAULT '',
  Department TEXT NOT NULL DEFAULT '',
  ModelID TEXT NOT NULL DEFAULT '',
  Model TEXT NOT NULL DEFAULT '',
  BrandName TEXT NOT NULL DEFAULT '',
  SerialNumber TEXT NOT NULL DEFAULT '',
  InstallationDate TEXT NOT NULL DEFAULT '',
  WarrantyYears TEXT NOT NULL DEFAULT '',
  WarrantyExpiry TEXT NOT NULL DEFAULT '',
  Status TEXT NOT NULL DEFAULT '',
  Remarks TEXT NOT NULL DEFAULT '',
  ImageURL TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS contracts (
  ContractID TEXT PRIMARY KEY,
  InstallationID TEXT NOT NULL DEFAULT '',
  NameOfCustomer TEXT NOT NULL DEFAULT '',
  Model TEXT NOT NULL DEFAULT '',
  SerialNumber TEXT NOT NULL DEFAULT '',
  ContractStart TEXT NOT NULL DEFAULT '',
  ContractEnd TEXT NOT NULL DEFAULT '',
  RenewalYears TEXT NOT NULL DEFAULT '',
  Status TEXT NOT NULL DEFAULT '',
  Remarks TEXT NOT NULL DEFAULT '',
  ContractType TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS tickets (
  TicketID TEXT PRIMARY KEY,
  TicketDate TEXT NOT NULL DEFAULT '',
  Date TEXT NOT NULL DEFAULT '',
  CustomerID TEXT NOT NULL DEFAULT '',
  NameOfCustomer TEXT NOT NULL DEFAULT '',
  MachineID TEXT NOT NULL DEFAULT '',
  InstallationID TEXT NOT NULL DEFAULT '',
  Model TEXT NOT NULL DEFAULT '',
  TicketTitle TEXT NOT NULL DEFAULT '',
  ProblemDescription TEXT NOT NULL DEFAULT '',
  Description TEXT NOT NULL DEFAULT '',
  ServiceType TEXT NOT NULL DEFAULT '',
  Priority TEXT NOT NULL DEFAULT '',
  ContractType TEXT NOT NULL DEFAULT '',
  WarrantyStatus TEXT NOT NULL DEFAULT '',
  AssignedEngineer TEXT NOT NULL DEFAULT '',
  TicketAcceptedAt TEXT NOT NULL DEFAULT '',
  TicketAcceptedBy TEXT NOT NULL DEFAULT '',
  AssistedBy TEXT NOT NULL DEFAULT '',
  TicketStatus TEXT NOT NULL DEFAULT '',
  ResponseType TEXT NOT NULL DEFAULT '',
  OpenedBy TEXT NOT NULL DEFAULT '',
  EngineerRemarks TEXT NOT NULL DEFAULT '',
  Resolution TEXT NOT NULL DEFAULT '',
  VisitDate TEXT NOT NULL DEFAULT '',
  CompletionDate TEXT NOT NULL DEFAULT '',
  CustomerSignatureURL TEXT NOT NULL DEFAULT '',
  AttachmentURLs TEXT NOT NULL DEFAULT '',
  ClosureStatus TEXT NOT NULL DEFAULT '',
  Latitude TEXT NOT NULL DEFAULT '',
  Longitude TEXT NOT NULL DEFAULT '',
  LastUpdated TEXT NOT NULL DEFAULT '',
  PMSID TEXT NOT NULL DEFAULT '',
  PMSNumber TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS engineers (
  EngineerID TEXT PRIMARY KEY,
  EngineerName TEXT NOT NULL DEFAULT '',
  Phone TEXT NOT NULL DEFAULT '',
  Email TEXT NOT NULL DEFAULT '',
  Department TEXT NOT NULL DEFAULT '',
  Role TEXT NOT NULL DEFAULT '',
  ActiveStatus TEXT NOT NULL DEFAULT '',
  LiveLatitude TEXT NOT NULL DEFAULT '',
  LiveLongitude TEXT NOT NULL DEFAULT '',
  LastLocationUpdate TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS engineer_location_logs (
  LocationLogID TEXT PRIMARY KEY,
  EngineerID TEXT NOT NULL DEFAULT '',
  EngineerName TEXT NOT NULL DEFAULT '',
  Latitude TEXT NOT NULL DEFAULT '',
  Longitude TEXT NOT NULL DEFAULT '',
  Remarks TEXT NOT NULL DEFAULT '',
  CreatedAt TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS ticket_logs (
  LogID TEXT PRIMARY KEY,
  TicketID TEXT NOT NULL DEFAULT '',
  UpdatedBy TEXT NOT NULL DEFAULT '',
  UpdateDate TEXT NOT NULL DEFAULT '',
  Status TEXT NOT NULL DEFAULT '',
  Remarks TEXT NOT NULL DEFAULT '',
  AttachmentURL TEXT NOT NULL DEFAULT '',
  Latitude TEXT NOT NULL DEFAULT '',
  Longitude TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS pms_schedule (
  PMSID TEXT PRIMARY KEY,
  PMSNumber TEXT NOT NULL DEFAULT '',
  MachineID TEXT NOT NULL DEFAULT '',
  CustomerID TEXT NOT NULL DEFAULT '',
  DueDate TEXT NOT NULL DEFAULT '',
  AssignedEngineer TEXT NOT NULL DEFAULT '',
  Status TEXT NOT NULL DEFAULT '',
  CompletionDate TEXT NOT NULL DEFAULT '',
  Remarks TEXT NOT NULL DEFAULT '',
  TicketID TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS users (
  UserID TEXT PRIMARY KEY,
  Name TEXT NOT NULL DEFAULT '',
  Email TEXT NOT NULL UNIQUE,
  PasswordHash TEXT NOT NULL DEFAULT '',
  Role TEXT NOT NULL DEFAULT '',
  EngineerID TEXT NOT NULL DEFAULT '',
  ActiveStatus TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS notifications (
  NotificationID TEXT PRIMARY KEY,
  Type TEXT NOT NULL DEFAULT '',
  Recipient TEXT NOT NULL DEFAULT '',
  UserID TEXT NOT NULL DEFAULT '',
  EngineerID TEXT NOT NULL DEFAULT '',
  Role TEXT NOT NULL DEFAULT '',
  Subject TEXT NOT NULL DEFAULT '',
  Message TEXT NOT NULL DEFAULT '',
  URL TEXT NOT NULL DEFAULT '',
  Status TEXT NOT NULL DEFAULT '',
  CreatedAt TEXT NOT NULL DEFAULT '',
  SentAt TEXT NOT NULL DEFAULT '',
  ReadAt TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS leave_requests (
  LeaveRequestID TEXT PRIMARY KEY,
  EngineerID TEXT NOT NULL DEFAULT '',
  EngineerName TEXT NOT NULL DEFAULT '',
  RequestedByUserID TEXT NOT NULL DEFAULT '',
  LeaveDate TEXT NOT NULL DEFAULT '',
  Reason TEXT NOT NULL DEFAULT '',
  Status TEXT NOT NULL DEFAULT '',
  ReviewedBy TEXT NOT NULL DEFAULT '',
  ReviewReason TEXT NOT NULL DEFAULT '',
  CreatedAt TEXT NOT NULL DEFAULT '',
  ReviewedAt TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  SubscriptionID TEXT PRIMARY KEY,
  UserID TEXT NOT NULL DEFAULT '',
  EngineerID TEXT NOT NULL DEFAULT '',
  Role TEXT NOT NULL DEFAULT '',
  Endpoint TEXT NOT NULL UNIQUE,
  P256DH TEXT NOT NULL DEFAULT '',
  AuthSecret TEXT NOT NULL DEFAULT '',
  UserAgent TEXT NOT NULL DEFAULT '',
  CreatedAt TEXT NOT NULL DEFAULT '',
  LastSeenAt TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS planned_visits (
  PlanID TEXT PRIMARY KEY,
  PlanType TEXT NOT NULL DEFAULT '',
  CustomerID TEXT NOT NULL DEFAULT '',
  MachineID TEXT NOT NULL DEFAULT '',
  PMSID TEXT NOT NULL DEFAULT '',
  TicketID TEXT NOT NULL DEFAULT '',
  AssignedEngineer TEXT NOT NULL DEFAULT '',
  VisitDate TEXT NOT NULL DEFAULT '',
  Status TEXT NOT NULL DEFAULT '',
  Remarks TEXT NOT NULL DEFAULT '',
  CreatedBy TEXT NOT NULL DEFAULT '',
  CreatedAt TEXT NOT NULL DEFAULT '',
  UpdatedAt TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS customer_visit_rules (
  RuleID TEXT PRIMARY KEY,
  CustomerID TEXT NOT NULL DEFAULT '',
  FrequencyDays TEXT NOT NULL DEFAULT '',
  AssignedEngineer TEXT NOT NULL DEFAULT '',
  StartDate TEXT NOT NULL DEFAULT '',
  LastGeneratedDate TEXT NOT NULL DEFAULT '',
  ActiveStatus TEXT NOT NULL DEFAULT '',
  Remarks TEXT NOT NULL DEFAULT '',
  CreatedAt TEXT NOT NULL DEFAULT '',
  UpdatedAt TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_installations_customer ON installations (CustomerID);
CREATE INDEX IF NOT EXISTS idx_installations_model ON installations (ModelID);
CREATE INDEX IF NOT EXISTS idx_contracts_installation ON contracts (InstallationID);
CREATE INDEX IF NOT EXISTS idx_contracts_end ON contracts (ContractEnd);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_engineer ON tickets (AssignedEngineer);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets (TicketStatus);
CREATE INDEX IF NOT EXISTS idx_tickets_installation ON tickets (InstallationID);
CREATE INDEX IF NOT EXISTS idx_tickets_last_updated ON tickets (LastUpdated);
CREATE INDEX IF NOT EXISTS idx_ticket_logs_ticket ON ticket_logs (TicketID);
CREATE INDEX IF NOT EXISTS idx_pms_machine ON pms_schedule (MachineID);
CREATE INDEX IF NOT EXISTS idx_pms_customer ON pms_schedule (CustomerID);
CREATE INDEX IF NOT EXISTS idx_pms_due_date ON pms_schedule (DueDate);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (Email);
CREATE INDEX IF NOT EXISTS idx_engineers_email ON engineers (Email);
CREATE INDEX IF NOT EXISTS idx_engineer_location_logs_engineer ON engineer_location_logs (EngineerID);
CREATE INDEX IF NOT EXISTS idx_engineer_location_logs_created ON engineer_location_logs (CreatedAt);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions (UserID);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_engineer ON push_subscriptions (EngineerID);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_role ON push_subscriptions (Role);
CREATE INDEX IF NOT EXISTS idx_planned_visits_date ON planned_visits (VisitDate);
CREATE INDEX IF NOT EXISTS idx_planned_visits_engineer ON planned_visits (AssignedEngineer);
CREATE INDEX IF NOT EXISTS idx_planned_visits_customer ON planned_visits (CustomerID);
CREATE INDEX IF NOT EXISTS idx_customer_visit_rules_customer ON customer_visit_rules (CustomerID);
CREATE INDEX IF NOT EXISTS idx_customer_visit_rules_engineer ON customer_visit_rules (AssignedEngineer);
