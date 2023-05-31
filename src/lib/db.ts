import { PrismaClient } from "@prisma/client";

function createPrismaClient(): PrismaClient {
  return new PrismaClient({ log: ["info", "warn", "error"] });
}

export const prisma = createPrismaClient();