import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { configuredRuntimeServices } from "@/lib/readiness";

export const dynamic = "force-dynamic";

export async function GET() {
  const services = configuredRuntimeServices(process.env);
  let database = false;

  try {
    await prisma.$queryRaw`SELECT 1`;
    database = true;
  } catch (error) {
    console.error("[api/health/ready] database check failed", error);
  }

  const checks = { database, ...services };
  const ready = Object.values(checks).every(Boolean);

  return NextResponse.json(
    {
      data: {
        ready,
        checks,
        release: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? null,
      },
    },
    {
      status: ready ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
