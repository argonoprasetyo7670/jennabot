import { PrismaClient } from "@/src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL!,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 10000,       // Release idle connections after 10s (default is 10000 but being explicit)
    max: process.env.NODE_ENV === "development" ? 3 : 2,
  });
  // Prevent unhandled pool errors from crashing the process
  pool.on("error", (err) => {
    console.error("[pg-pool] Idle client error:", err.message);
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
