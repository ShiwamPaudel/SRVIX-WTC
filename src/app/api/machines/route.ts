import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dataService } from "@/lib/turso/service";
import { addDays, addMonths, toDateInputValue, uniqueCompactId } from "@/lib/utils";
import type { Installation, PMSSchedule } from "@/types/service";

type InstallationRequest = Partial<Installation> & {
  WarrantyYears?: string;
};

function validDate(value?: string) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as InstallationRequest;
  const installationDate = validDate(body.InstallationDate);
  const warrantyYears = Number(body.WarrantyYears ?? 1);

  if (!body.CustomerID || !body.ModelID || !body.SerialNumber || !installationDate) {
    return NextResponse.json(
      { error: "Customer, device model, serial number, and installation date are required" },
      { status: 400 },
    );
  }

  if (!Number.isFinite(warrantyYears) || warrantyYears <= 0) {
    return NextResponse.json({ error: "Warranty years must be greater than zero" }, { status: 400 });
  }

  const [customers, models, installations, pmsRows] = await Promise.all([
    dataService.customers(),
    dataService.deviceModels(),
    dataService.installations(),
    dataService.pmsSchedule(),
  ]);

  const customer = customers.find((item) => item.CustomerID === body.CustomerID);
  if (!customer) return NextResponse.json({ error: "Selected customer was not found" }, { status: 400 });

  const model = models.find((item) => item.ModelID === body.ModelID);
  if (!model) return NextResponse.json({ error: "Selected device model was not found" }, { status: 400 });

  const pmsIntervalDays = Number(model.PMSFrequency);
  if (!Number.isFinite(pmsIntervalDays) || pmsIntervalDays <= 0) {
    return NextResponse.json({ error: "Selected model has invalid PMS frequency" }, { status: 400 });
  }

  const warrantyExpiry = addMonths(installationDate, warrantyYears * 12);
  const installationId = uniqueCompactId("INS", installations.map((item) => item.InstallationID));
  const firstPmsDate = addDays(installationDate, pmsIntervalDays);

  const installation: Installation = {
    InstallationID: installationId,
    CustomerID: body.CustomerID,
    NameOfCustomer: customer.NameOfCustomer || customer.HospitalName || "",
    Department: body.Department ?? "",
    ModelID: model.ModelID,
    Model: model.Model,
    BrandName: model.BrandName,
    SerialNumber: body.SerialNumber,
    InstallationDate: toDateInputValue(installationDate),
    WarrantyYears: String(warrantyYears),
    WarrantyExpiry: toDateInputValue(warrantyExpiry),
    Status: body.Status ?? "Operational",
    Remarks: body.Remarks ?? "",
    ImageURL: body.ImageURL || model.ImageURL || "",
  };

  const existingPmsIds = new Set(pmsRows.map((item) => item.PMSID));
  const generatedPms: PMSSchedule[] = [];
  let pmsNumber = 1;
  let nextPmsDate = firstPmsDate;

  while (nextPmsDate <= warrantyExpiry && generatedPms.length < 100) {
    const pmsId = uniqueCompactId("PMS", existingPmsIds);
    existingPmsIds.add(pmsId);
    generatedPms.push({
      PMSID: pmsId,
      PMSNumber: String(pmsNumber),
      MachineID: installation.InstallationID,
      CustomerID: installation.CustomerID,
      DueDate: toDateInputValue(nextPmsDate),
      AssignedEngineer: "",
      Status: "Scheduled",
      CompletionDate: "",
      Remarks: `Auto-generated PMS from ${model.PMSFrequency}-day model frequency`,
      TicketID: "",
    });
    pmsNumber += 1;
    nextPmsDate = addDays(nextPmsDate, pmsIntervalDays);
  }

  await dataService.createInstallation(installation);
  await Promise.all(generatedPms.map((pms) => dataService.createPMSSchedule(pms)));

  return NextResponse.json({ installation, pms: generatedPms }, { status: 201 });
}
