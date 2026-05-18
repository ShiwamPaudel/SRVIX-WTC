import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dataService } from "@/lib/turso/service";

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as { name?: string; password?: string };
  const name = body.name?.trim();
  const password = body.password?.trim();

  if (!name && !password) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const patch: { Name?: string; PasswordHash?: string } = {};
  if (name) patch.Name = name;
  if (password) patch.PasswordHash = password;

  const user = await dataService.updateUser(session.user.id, patch);
  return NextResponse.json({ user: { id: user.UserID, name: user.Name, email: user.Email, role: user.Role } });
}
