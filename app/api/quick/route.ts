import { NextResponse, after } from "next/server";
import { db, type Tx } from "@/lib/supabase";
import { hasValidToken } from "@/lib/auth";
import { buildStats } from "@/lib/stats";
import { parseQuick } from "@/lib/quick";
import { pushToSheet, sheetRow } from "@/lib/sheets";

export const dynamic = "force-dynamic";

const money = (n: number) => n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// POST { text: "150 zus coffee", dryRun?: true }
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
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) return NextResponse.json({ error: "empty", message: "Nothing to save." }, { status: 400 });

  const supabase = db();
  const { data: history } = await supabase
    .from("transactions")
    .select("place,category,amount")
    .order("created_at", { ascending: false })
    .limit(2000);
  const stats = buildStats(history ?? []);
  const parsed = parseQuick(text, stats.places, stats.categories);
  if (!parsed) {
    return NextResponse.json(
      { error: "no amount", message: "No amount found. Try: 150 zus coffee" },
      { status: 400 }
    );
  }

  const summary = [
    `${parsed.type === "add" ? "+" : "-"}${money(parsed.amount)}`,
    parsed.place ?? "no place",
    parsed.category,
    parsed.note,
  ]
    .filter(Boolean)
    .join(" · ");

  if (body.dryRun === true) return NextResponse.json({ ok: true, dryRun: true, parsed, summary });

  const { data: row, error } = await supabase
    .from("transactions")
    .insert({
      amount: parsed.type === "add" ? parsed.amount : -parsed.amount,
      place: parsed.place,
      category: parsed.category,
      note: parsed.note,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message, message: "Could not save." }, { status: 500 });
  after(() => pushToSheet({ action: "add", ...sheetRow(row as Tx) }));

  const { data: bal } = await supabase.from("balance").select("balance").single();
  const balance = Number(bal?.balance ?? 0);
  return NextResponse.json({
    ok: true,
    balance,
    parsed,
    summary,
    message: `${summary}\nBalance: ${money(balance)}`,
  });
}
