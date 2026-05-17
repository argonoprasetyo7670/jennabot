import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import type { Adapter, AdapterAccount, AdapterUser, AdapterSession } from "next-auth/adapters";

export function CustomPrismaAdapter(): Adapter {
  return {
    async createUser(data) {
      const user = await prisma.users.create({
        data: {
          id: crypto.randomUUID(),
          email: data.email,
          name: data.name ?? null,
          image: data.image ?? null,
          emailVerified: data.emailVerified ?? null,
          updatedAt: new Date(),
        },
      });
      return { id: user.id, email: user.email, name: user.name, image: user.image, emailVerified: user.emailVerified } as AdapterUser;
    },

    async getUser(id) {
      const user = await prisma.users.findUnique({ where: { id } });
      if (!user) return null;
      return { id: user.id, email: user.email, name: user.name, image: user.image, emailVerified: user.emailVerified } as AdapterUser;
    },

    async getUserByEmail(email) {
      const user = await prisma.users.findUnique({ where: { email } });
      if (!user) return null;
      return { id: user.id, email: user.email, name: user.name, image: user.image, emailVerified: user.emailVerified } as AdapterUser;
    },

    async getUserByAccount({ provider, providerAccountId }) {
      const account = await prisma.accounts.findUnique({
        where: { provider_providerAccountId: { provider, providerAccountId } },
        include: { users: true },
      });
      if (!account?.users) return null;
      const u = account.users;
      return { id: u.id, email: u.email, name: u.name, image: u.image, emailVerified: u.emailVerified } as AdapterUser;
    },

    async updateUser(data) {
      const user = await prisma.users.update({
        where: { id: data.id },
        data: {
          name: data.name ?? undefined,
          email: data.email ?? undefined,
          image: data.image ?? undefined,
          emailVerified: data.emailVerified ?? undefined,
          updatedAt: new Date(),
        },
      });
      return { id: user.id, email: user.email, name: user.name, image: user.image, emailVerified: user.emailVerified } as AdapterUser;
    },

    async deleteUser(id) {
      await prisma.users.delete({ where: { id } });
    },

    async linkAccount(data) {
      await prisma.accounts.create({
        data: {
          id: crypto.randomUUID(),
          userId: data.userId,
          type: data.type,
          provider: data.provider,
          providerAccountId: data.providerAccountId,
          refresh_token: data.refresh_token ?? null,
          access_token: data.access_token ?? null,
          expires_at: data.expires_at ?? null,
          token_type: data.token_type ?? null,
          scope: data.scope ?? null,
          id_token: data.id_token ?? null,
          session_state: data.session_state as string ?? null,
        },
      });
      return data as AdapterAccount;
    },

    async unlinkAccount({ provider, providerAccountId }) {
      await prisma.accounts.delete({
        where: { provider_providerAccountId: { provider, providerAccountId } },
      });
    },

    async createSession(data) {
      const session = await prisma.sessions.create({
        data: {
          id: crypto.randomUUID(),
          sessionToken: data.sessionToken,
          userId: data.userId,
          expires: data.expires,
        },
      });
      return session as AdapterSession;
    },

    async getSessionAndUser(sessionToken) {
      const session = await prisma.sessions.findUnique({
        where: { sessionToken },
        include: { users: true },
      });
      if (!session?.users) return null;
      const u = session.users;
      return {
        session: { sessionToken: session.sessionToken, userId: session.userId, expires: session.expires } as AdapterSession,
        user: { id: u.id, email: u.email, name: u.name, image: u.image, emailVerified: u.emailVerified } as AdapterUser,
      };
    },

    async updateSession(data) {
      const session = await prisma.sessions.update({
        where: { sessionToken: data.sessionToken },
        data: { expires: data.expires ?? undefined },
      });
      return session as AdapterSession;
    },

    async deleteSession(sessionToken) {
      await prisma.sessions.delete({ where: { sessionToken } });
    },

    async createVerificationToken(data) {
      const token = await prisma.verification_tokens.create({
        data: { identifier: data.identifier, token: data.token, expires: data.expires },
      });
      return { identifier: token.identifier, token: token.token, expires: token.expires };
    },

    async useVerificationToken({ identifier, token }) {
      try {
        const vt = await prisma.verification_tokens.delete({
          where: { identifier_token: { identifier, token } },
        });
        return { identifier: vt.identifier, token: vt.token, expires: vt.expires };
      } catch {
        return null;
      }
    },
  };
}
