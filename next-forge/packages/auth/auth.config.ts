import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { DEFAULT_ORG_ID } from "./constants";

export const authConfig = {
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;

        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        const devEmail = process.env.AUTH_DEV_EMAIL ?? "dev@modme.local";
        const devPassword = process.env.AUTH_DEV_PASSWORD ?? "devpassword";

        if (email === devEmail && password === devPassword) {
          return {
            id: "dev-user",
            name: "Dev User",
            email: devEmail,
            orgId: DEFAULT_ORG_ID,
          };
        }

        return null;
      },
    }),
  ],
  pages: {
    signIn: "/sign-in",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.orgId = (user as { orgId?: string }).orgId ?? DEFAULT_ORG_ID;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "dev-user";
        (session.user as { orgId?: string }).orgId =
          (token.orgId as string | undefined) ?? DEFAULT_ORG_ID;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
  trustHost: true,
} satisfies NextAuthConfig;
