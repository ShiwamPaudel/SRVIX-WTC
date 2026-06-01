import type { ContractRecord, ContractType } from "@/types/service";

export type CoverageSource = "Contract" | "Warranty" | "None";

export type MachineCoverage = {
  contractType: ContractType;
  warrantyStatus: "Under Warranty" | "Warranty Expired" | "Unknown";
  activeContract?: ContractRecord;
  source: CoverageSource;
  startDate: string;
  endDate: string;
};

function dateKey(value?: string | Date | null): string {
  if (!value) return "";
  if (value instanceof Date) {
    return [
      value.getFullYear(),
      String(value.getMonth() + 1).padStart(2, "0"),
      String(value.getDate()).padStart(2, "0"),
    ].join("-");
  }

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : dateKey(date);
}

export function todayKey(today = new Date()) {
  return dateKey(today);
}

export function compareDateValues(left?: string | Date | null, right?: string | Date | null) {
  const leftKey = dateKey(left);
  const rightKey = dateKey(right);

  if (!leftKey && !rightKey) return 0;
  if (!leftKey) return -1;
  if (!rightKey) return 1;
  return leftKey.localeCompare(rightKey);
}

export function isWarrantyActive(expiry?: string, today = new Date()) {
  const expiryKey = dateKey(expiry);
  return Boolean(expiryKey && expiryKey >= todayKey(today));
}

export function warrantyStatus(expiry?: string, today = new Date()): MachineCoverage["warrantyStatus"] {
  if (!expiry || !dateKey(expiry)) return "Unknown";
  return isWarrantyActive(expiry, today) ? "Under Warranty" : "Warranty Expired";
}

export function contractTypeToCoverage(contractType?: ContractRecord["ContractType"]): ContractType {
  if (contractType === "AMC") return "Under AMC";
  if (contractType === "CMC") return "CMC";
  if (contractType === "RRC") return "RRC";
  return "Out of Warranty";
}

export function isContractActive(contract: ContractRecord, today = new Date()) {
  const current = todayKey(today);
  const startsOn = dateKey(contract.ContractStart);
  const endsOn = dateKey(contract.ContractEnd);

  return Boolean(
    endsOn &&
      endsOn >= current &&
      (!startsOn || startsOn <= current) &&
      contract.Status !== "Expired",
  );
}

export function contractLifecycleStatus(contract: ContractRecord, today = new Date()) {
  const current = todayKey(today);
  const startsOn = dateKey(contract.ContractStart);
  const endsOn = dateKey(contract.ContractEnd);

  if (isContractActive(contract, today)) return "Active";
  if (contract.Status !== "Expired" && endsOn >= current && startsOn > current) return "Scheduled";
  return "Expired";
}

export function currentContract(contracts: ContractRecord[], today = new Date()) {
  return contracts
    .filter((contract) => isContractActive(contract, today))
    .sort((a, b) => compareDateValues(b.ContractEnd, a.ContractEnd))[0];
}

export function machineCoverage(warrantyExpiry: string, contracts: ContractRecord[] = [], today = new Date()): MachineCoverage {
  const activeContract = currentContract(contracts, today);

  if (activeContract) {
    return {
      contractType: contractTypeToCoverage(activeContract.ContractType),
      warrantyStatus: warrantyStatus(warrantyExpiry, today),
      activeContract,
      source: "Contract",
      startDate: activeContract.ContractStart,
      endDate: activeContract.ContractEnd,
    };
  }

  if (isWarrantyActive(warrantyExpiry, today)) {
    return {
      contractType: "Under Warranty",
      warrantyStatus: "Under Warranty",
      source: "Warranty",
      startDate: "",
      endDate: warrantyExpiry,
    };
  }

  return {
    contractType: "Out of Warranty",
    warrantyStatus: warrantyStatus(warrantyExpiry, today),
    source: "None",
    startDate: "",
    endDate: warrantyExpiry,
  };
}
