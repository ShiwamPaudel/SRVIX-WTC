import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/permissions";
import { dataService } from "@/lib/turso/service";
import { addDays, addMonths, toDateInputValue, uniqueCompactId } from "@/lib/utils";
import type { ContractRecord, PMSSchedule } from "@/types/service";

function parseDate(value?: string) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function nextPmsNumber(rows: PMSSchedule[], machineId: string) {
  const numbers = rows
    .filter((row) => row.MachineID === machineId)
    .map((row) => Number(row.PMSNumber))
    .filter((value) => Number.isFinite(value));
  return numbers.length ? Math.max(...numbers) + 1 : rows.filter((row) => row.MachineID === machineId).length + 1;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(session.user.role)) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const body = (await request.json()) as {
    machineId?: string;
    contractType?: "AMC" | "CMC" | "RRC";
    contractStart?: string;
    renewalYears?: string;
    pmsIntervalDays?: string;
    remarks?: string;
  };

  const start = parseDate(body.contractStart);
  const renewalYears = Number(body.renewalYears ?? 1);
  const pmsIntervalDays = Number(body.pmsIntervalDays ?? 90);

  if (!body.machineId || !body.contractType || !start) {
    return NextResponse.json({ error: "Machine, contract type, and start date are required" }, { status: 400 });
  }
  if (!Number.isFinite(renewalYears) || renewalYears <= 0) {
    return NextResponse.json({ error: "Renewal years must be greater than zero" }, { status: 400 });
  }
  if (!Number.isFinite(pmsIntervalDays) || pmsIntervalDays <= 0) {
    return NextResponse.json({ error: "PMS interval must be greater than zero" }, { status: 400 });
  }

  const [machines, contracts, pmsRows] = await Promise.all([
    dataService.machines(),
    dataService.contracts(),
    dataService.pmsSchedule(),
  ]);
  const machine = machines.find((item) => item.MachineID === body.machineId || item.InstallationID === body.machineId);
  if (!machine) return NextResponse.json({ error: "Selected machine was not found" }, { status: 400 });

  const contractEnd = addMonths(start, renewalYears * 12);
  const contract: ContractRecord = {
    ContractID: uniqueCompactId("CON", contracts.map((item) => item.ContractID)),
    InstallationID: machine.InstallationID || machine.MachineID,
    NameOfCustomer: machine.NameOfCustomer ?? "",
    Model: machine.Model,
    SerialNumber: machine.SerialNumber,
    ContractStart: toDateInputValue(start),
    ContractEnd: toDateInputValue(contractEnd),
    RenewalYears: String(renewalYears),
    Status: "Active",
    Remarks: body.remarks ?? "",
    ContractType: body.contractType,
  };

  const existingPmsIds = new Set(pmsRows.map((item) => item.PMSID));
  let nextDate = addDays(start, pmsIntervalDays);
  let pmsNumber = nextPmsNumber(pmsRows, machine.MachineID);
  const generatedPms: PMSSchedule[] = [];

  while (nextDate <= contractEnd && generatedPms.length < 100) {
    const pmsId = uniqueCompactId("PMS", existingPmsIds);
    existingPmsIds.add(pmsId);
    generatedPms.push({
      PMSID: pmsId,
      PMSNumber: String(pmsNumber),
      MachineID: machine.MachineID,
      CustomerID: machine.CustomerID,
      DueDate: toDateInputValue(nextDate),
      AssignedEngineer: "",
      Status: "Scheduled",
      CompletionDate: "",
      Remarks: `Auto-generated from ${body.contractType} renewal`,
      TicketID: "",
    });
    pmsNumber += 1;
    nextDate = addDays(nextDate, pmsIntervalDays);
  }

  await dataService.createContract(contract);
  await Promise.all(generatedPms.map((pms) => dataService.createPMSSchedule(pms)));

  return NextResponse.json({ contract, pms: generatedPms }, { status: 201 });
}
