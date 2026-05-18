import type { DefaultSession } from "next-auth";
import type { UserRole } from "@/types/service";

declare module "next-auth" {
  interface User {
    role?: UserRole;
    engineerId?: string;
  }

  interface Session {
    user: {
      id: string;
      role?: UserRole;
      engineerId?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: UserRole;
    engineerId?: string;
  }
}
