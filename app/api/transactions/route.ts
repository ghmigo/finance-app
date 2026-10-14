import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { hasValidToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST { amount: 150, type: "spend" | "add", place?, category?, note? }
export async function POST(req: Request) {
  if (!hasValidToken(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const raw = Math.abs(Number(body.amount));
  if (!Number.isFinite(raw) || raw === 0) {
    return NextResponse.json({ error: "invalid amount" }, { status: 400 });
  }
  const amount = body.type === "add" ? raw : -raw;
  const clean = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

  const supabase = db();
  const { error } = await supabase.from("transactions").insert({
    amount,
    place: clean(body.place),
    category: clean(body.category)?.toLowerCase() ?? "uncategorized",
    note: clean(body.note),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data } = await supabase.from("balance").select("balance").single();
  return NextResponse.json({ ok: true, balance: Number(data?.balance ?? 0) });
}

// GET -> current balance (handy for a Shortcut that just shows it)
export async function GET(req: Request) {
  if (!hasValidToken(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { data, error } = await db().from("balance").select("balance").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ balance: Number(data?.balance ?? 0) });
}
