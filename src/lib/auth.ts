import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "./db";
import { verifyPassword } from "./crypto";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    // We handle login inside the single `/` page, but keep a fallback.
    signIn: "/",
  },
  providers: [
    CredentialsProvider({
      name: "ReplyPilot",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        demo: { label: "Demo", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;
        // Demo bypass: any email + the literal "demo" flag auto-logs into the demo tenant.
        if (credentials.demo === "1") {
          const user = await db.user.findFirst({
            where: { email: credentials.email },
            include: { tenant: true },
          });
          if (user) {
            return { id: user.id, email: user.email, name: user.name, tenantId: user.tenantId, role: user.role };
          }
        }
        const user = await db.user.findUnique({
          where: { email: credentials.email },
          include: { tenant: true },
        });
        if (!user || !user.passwordHash) return null;
        if (!verifyPassword(credentials.password || "", user.passwordHash)) return null;
        return { id: user.id, email: user.email, name: user.name, tenantId: user.tenantId, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as { id: string; tenantId: string; role: string };
        token.id = u.id;
        token.tenantId = u.tenantId;
        token.role = u.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string; tenantId?: string; role?: string }).id = token.id as string;
        (session.user as { tenantId?: string }).tenantId = token.tenantId as string;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export type AppSession = {
  user: { id: string; email: string; name?: string | null; tenantId: string; role: string };
};
