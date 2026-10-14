import ExcelJS from "exceljs";
import { cookies } from "next/headers";
import { db, type Tx } from "@/lib/supabase";
import { hasValidToken, safeEqual, sessionValue } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = (await cookies()).get("session")?.value ?? "";
  if (!hasValidToken(req) && !(session && safeEqual(session, sessionValue()))) {
    return new Response("unauthorized", { status: 401 });
  }

  const { data, error } = await db()
    .from("transactions")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return new Response(error.message, { status: 500 });
  const rows = (data ?? []) as Tx[];

  const wb = new ExcelJS.Workbook();

  // Sheet 1: every transaction, sorted by category then amount (largest spend first)
  const all = wb.addWorksheet("Transactions");
  all.columns = [
    { header: "Date", key: "date", width: 20 },
    { header: "Category", key: "category", width: 18 },
    { header: "Amount", key: "amount", width: 14 },
    { header: "Place", key: "place", width: 24 },
    { header: "Reason / Note", key: "note", width: 32 },
  ];
  [...rows]
    .sort((a, b) => a.category.localeCompare(b.category) || Number(a.amount) - Number(b.amount))
    .forEach((r) =>
      all.addRow({
        date: new Date(r.created_at),
        category: r.category,
        amount: Number(r.amount),
        place: r.place ?? "",
        note: r.note ?? "",
      })
    );
  all.getColumn("date").numFmt = "yyyy-mm-dd hh:mm";
  all.getColumn("amount").numFmt = "#,##0.00;[Red]-#,##0.00";
  all.getRow(1).font = { bold: true };
  all.views = [{ state: "frozen", ySplit: 1 }];
  all.autoFilter = "A1:E1";

  // Sheet 2: spending by category
  const byCat = new Map<string, { total: number; count: number }>();
  const byPlace = new Map<string, { total: number; count: number }>();
  for (const r of rows) {
    if (Number(r.amount) >= 0) continue;
    const spend = -Number(r.amount);
    const c = byCat.get(r.category) ?? { total: 0, count: 0 };
    byCat.set(r.category, { total: c.total + spend, count: c.count + 1 });
    const p = r.place ?? "(none)";
    const pv = byPlace.get(p) ?? { total: 0, count: 0 };
    byPlace.set(p, { total: pv.total + spend, count: pv.count + 1 });
  }
  const summary = (name: string, label: string, m: Map<string, { total: number; count: number }>) => {
    const ws = wb.addWorksheet(name);
    ws.columns = [
      { header: label, key: "k", width: 24 },
      { header: "Total spent", key: "t", width: 16 },
      { header: "# of spends", key: "c", width: 12 },
    ];
    [...m.entries()]
      .sort((a, b) => b[1].total - a[1].total)
      .forEach(([k, v]) => ws.addRow({ k, t: v.total, c: v.count }));
    ws.getColumn("t").numFmt = "#,##0.00";
    ws.getRow(1).font = { bold: true };
  };
  summary("By Category", "Category", byCat);
  summary("By Place", "Place", byPlace);

  const buf = await wb.xlsx.writeBuffer();
  return new Response(buf as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="expenses-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
