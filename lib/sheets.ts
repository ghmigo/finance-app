import type { Tx } from "./supabase";

// Pushes changes to the Google Sheet through an Apps Script web app (see apps-script/Code.gs).
// Failures are logged and never block saving a transaction.
export async function pushToSheet(payload: Record<string, unknown>) {
  const url = process.env.SHEETS_WEBHOOK_URL;
  const secret = process.env.SHEETS_WEBHOOK_SECRET;
  if (!url || !secret) return;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ secret, ...payload }),
      redirect: "follow",
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) console.error("sheets webhook failed", res.status);
  } catch (e) {
    console.error("sheets webhook error", e);
  }
}

export function sheetRow(r: Tx) {
  return {
    id: r.id,
    date: r.created_at,
    category: r.category,
    amount: Number(r.amount),
    place: r.place ?? "",
    note: r.note ?? "",
  };
}
