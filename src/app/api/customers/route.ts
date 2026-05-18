import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dataService } from "@/lib/turso/service";
import { uniqueCompactId } from "@/lib/utils";
import type { Customer } from "@/types/service";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as Partial<Customer>;
  if (!body.NameOfCustomer) {
    return NextResponse.json({ error: "Customer name is required" }, { status: 400 });
  }

  const customers = await dataService.customers();
  const customer: Customer = {
    CustomerID: uniqueCompactId("CUS", customers.map((item) => item.CustomerID)),
    NameOfCustomer: body.NameOfCustomer,
    Province: body.Province ?? "",
    District: body.District ?? "",
    Address: body.Address ?? "",
    CustomerType: body.CustomerType ?? "",
  };

  await dataService.createCustomer(customer);
  return NextResponse.json({ customer }, { status: 201 });
}
