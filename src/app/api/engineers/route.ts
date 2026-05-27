import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/permissions";
import { dataService } from "@/lib/turso/service";
import { uniqueCompactId } from "@/lib/utils";
import type { AppUser, Engineer } from "@/types/service";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(session.user.role)) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const body = (await request.json()) as Partial<Engineer> & { Password?: string };
  if (!body.EngineerName || !body.Email || !body.Password) {
    return NextResponse.json({ error: "Engineer name, email, and password are required" }, { status: 400 });
  }

  const [engineers, users] = await Promise.all([dataService.engineers(), dataService.users()]);
  const email = body.Email.toLowerCase().trim();
  if (users.some((user) => user.Email.toLowerCase() === email) || engineers.some((engineer) => engineer.Email.toLowerCase() === email)) {
    return NextResponse.json({ error: "An engineer or user already exists with this email" }, { status: 409 });
  }

  const engineerId = uniqueCompactId("ENG", engineers.map((item) => item.EngineerID));
  const engineer: Engineer = {
    EngineerID: engineerId,
    EngineerName: body.EngineerName,
    Phone: body.Phone ?? "",
    Email: email,
    Department: body.Department ?? "",
    Role: body.Role ?? "Engineer",
    ActiveStatus: body.ActiveStatus ?? "Available",
    LiveLatitude: "",
    LiveLongitude: "",
    LastLocationUpdate: "",
  };
  const user: AppUser = {
    UserID: uniqueCompactId("USR", users.map((item) => item.UserID)),
    Name: engineer.EngineerName,
    Email: email,
    PasswordHash: body.Password,
    Role: "Engineer",
    EngineerID: engineerId,
    ActiveStatus: "Active",
  };

  await dataService.createEngineer(engineer);
  await dataService.createUser(user);

  return NextResponse.json({ engineer }, { status: 201 });
}
