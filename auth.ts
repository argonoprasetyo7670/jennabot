import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const authSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

if (
  process.env.AUTH_SECRET &&
  process.env.NEXTAUTH_SECRET &&
  process.env.AUTH_SECRET !== process.env.NEXTAUTH_SECRET
) {
  throw new Error("AUTH_SECRET and NEXTAUTH_SECRET must be identical");
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: authSecret,
  // No adapter — we handle user creation manually via signIn callback
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production"
        ? "__Secure-authjs.session-token"
        : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    callbackUrl: {
      name: process.env.NODE_ENV === "production"
        ? "__Secure-authjs.callback-url"
        : "authjs.callback-url",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    csrfToken: {
      name: process.env.NODE_ENV === "production"
        ? "__Host-authjs.csrf-token"
        : "authjs.csrf-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    pkceCodeVerifier: {
      name: process.env.NODE_ENV === "production"
        ? "__Secure-authjs.pkce.code_verifier"
        : "authjs.pkce.code_verifier",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 15, // 15 minutes
      },
    },
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      checks: ["pkce"],
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.users.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.password) {
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Handle Google OAuth: create or find user in our DB
      if (account?.provider === "google" && profile?.email) {
        try {
          let dbUser = await prisma.users.findUnique({
            where: { email: profile.email },
          });

          if (!dbUser) {
            // Create new user from Google profile
            dbUser = await prisma.users.create({
              data: {
                id: crypto.randomUUID(),
                email: profile.email,
                name: profile.name ?? profile.email.split("@")[0],
                image: (profile as Record<string, unknown>).picture as string ?? null,
                emailVerified: new Date(),
                updatedAt: new Date(),
              },
            });
          }

          // Store/update the OAuth account link
          const existingAccount = await prisma.accounts.findUnique({
            where: {
              provider_providerAccountId: {
                provider: account.provider,
                providerAccountId: account.providerAccountId,
              },
            },
          });

          if (!existingAccount) {
            await prisma.accounts.create({
              data: {
                id: crypto.randomUUID(),
                userId: dbUser.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                access_token: account.access_token ?? null,
                refresh_token: account.refresh_token ?? null,
                expires_at: account.expires_at ?? null,
                token_type: account.token_type ?? null,
                scope: account.scope ?? null,
                id_token: account.id_token ?? null,
                session_state: account.session_state as string ?? null,
              },
            });
          }

          // Set user.id so it's available in jwt callback
          user.id = dbUser.id;
          return true;
        } catch (error) {
          console.error("Google sign-in error:", error);
          return false;
        }
      }

      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      // Fetch role from DB on first sign-in OR when role is missing from existing token
      if (token.sub && !token.role) {
        try {
          const dbUser = await prisma.users.findUnique({
            where: { id: token.sub },
            select: { role: true },
          });
          token.role = dbUser?.role ?? "user";
        } catch {
          token.role = "user";
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
        session.user.role = (token.role as string) ?? "user";
      }
      return session;
    },
  },
});
