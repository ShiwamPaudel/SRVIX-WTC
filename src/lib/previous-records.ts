import type { Customer, Machine, PreviousRecord } from "@/types/service";

export function normalizePreviousRecordKey(value?: string | null) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function previousRecordsForMachine(records: PreviousRecord[], machine: Machine, customer?: Customer) {
  const customerNames = new Set(
    [customer?.HospitalName, customer?.NameOfCustomer, machine.NameOfCustomer]
      .map(normalizePreviousRecordKey)
      .filter(Boolean),
  );
  const devices = new Set([machine.DeviceName, machine.Model].map(normalizePreviousRecordKey).filter(Boolean));

  return records
    .filter(
      (record) =>
        customerNames.has(normalizePreviousRecordKey(record.name_of_customer)) &&
        devices.has(normalizePreviousRecordKey(record.device)),
    )
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}
