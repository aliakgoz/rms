import { NextRequest, NextResponse } from "next/server";
import { createRequirement, getDashboardData } from "@/lib/rms/store";

export async function GET() {
  const { db } = getDashboardData();
  return NextResponse.json({ requirements: db.requirements });
}

export async function POST(request: NextRequest) {
  const payload = await request.json();
  const requirement = createRequirement(payload);
  return NextResponse.json({ requirement }, { status: 201 });
}
