import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db, ensureSeedData } from "./db";
import { verifyPassword } from "./crypto";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    // We handle login inside the single `/` page, but keep a fallback.
    signIn: "/",
  },
  providers: [
    CredentialsProvider({
      name: "آریا",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        demo: { label: "Demo", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;
        // Ensure DB has demo data (for serverless cold starts on Vercel)
        await ensureSeedData();
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
      // Re-validate the user still exists in the DB on each request.
      // This handles re-seed scenarios where the user/tenant ID changed.
      if (token.id) {
        const fresh = await db.user.findUnique({
          where: { id: token.id },
          select: { tenantId: true, role: true },
        });
        if (!fresh) {
          // User was deleted (e.g. re-seed) — invalidate the token.
          token.tenantId = "";
          token.id = "";
        } else {
          token.tenantId = fresh.tenantId;
          token.role = fresh.role;
        }
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
