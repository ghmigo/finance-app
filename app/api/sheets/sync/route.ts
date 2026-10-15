import { NextResponse } from "next/server";
import { db, type Tx } from "@/lib/supabase";
import { hasValidToken } from "@/lib/auth";
import { pushToSheet, sheetRow } from "@/lib/sheets";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// POST: re-send every transaction to the sheet. The sheet script skips IDs it already has,
// so this only fills in rows that were missed (for example while the webhook was down).
export async function POST(req: Request) {
  if (!hasValidToken(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { data, error } = await db()
    .from("transactions")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const rows = (data ?? []) as Tx[];
  await pushToSheet({ action: "bulk", rows: rows.map(sheetRow) });
  return NextResponse.json({ ok: true, sent: rows.length });
}
