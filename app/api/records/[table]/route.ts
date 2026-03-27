import { NextRequest, NextResponse } from "next/server";
import { createTableRecord, getDashboardData } from "@/lib/rms/store";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ table: string }> }
) {
  const { table } = await context.params;
  const { db } = getDashboardData();
  return NextResponse.json({ table, records: db.recordsByTable[table] || [] });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ table: string }> }
) {
  const { table } = await context.params;
  const payload = await request.json();
  const record = createTableRecord(table, payload);
  return NextResponse.json({ table, record }, { status: 201 });
}
