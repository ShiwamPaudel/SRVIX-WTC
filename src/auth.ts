import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { dataService } from "@/lib/turso/service";
import type { UserRole } from "@/types/service";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

class InvalidLoginInputError extends CredentialsSignin {
  code = "invalid_login_input";
}

class UserNotFoundError extends CredentialsSignin {
  code = "user_not_found";
}

class PasswordMismatchError extends CredentialsSignin {
  code = "password_mismatch";
}

class UserInactiveError extends CredentialsSignin {
  code = "user_inactive";
}

class PasswordNotConfiguredError extends CredentialsSignin {
  code = "password_not_configured";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) throw new InvalidLoginInputError();

        const users = await dataService.users();
        const user = users.find((candidate) => candidate.Email.toLowerCase() === parsed.data.email.toLowerCase());

        if (!user) throw new UserNotFoundError();
        if (user.ActiveStatus === "Inactive") throw new UserInactiveError();
        if (!user.PasswordHash) throw new PasswordNotConfiguredError();
        if (parsed.data.password !== user.PasswordHash) throw new PasswordMismatchError();

        return {
          id: user.UserID,
          name: user.Name,
          email: user.Email,
          role: user.Role,
          engineerId: user.EngineerID,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role as UserRole | undefined;
        token.engineerId = user.engineerId;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = token.role as UserRole | undefined;
        session.user.engineerId = token.engineerId as string | undefined;
      }
      return session;
    },
  },
});
