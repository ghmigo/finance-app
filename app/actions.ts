"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { db, type Tx } from "@/lib/supabase";
import { safeEqual, sessionValue } from "@/lib/auth";
import { pushToSheet, sheetRow } from "@/lib/sheets";

async function requireSession() {
  const s = (await cookies()).get("session")?.value ?? "";
  if (!s || !safeEqual(s, sessionValue())) throw new Error("unauthorized");
}

export async function login(formData: FormData) {
  const pw = String(formData.get("password") ?? "");
  const expected = process.env.DASHBOARD_PASSWORD;
  if (!expected || !safeEqual(pw, expected)) return;
  (await cookies()).set("session", sessionValue(), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });
  revalidatePath("/");
}

export async function logout() {
  (await cookies()).delete("session");
  revalidatePath("/");
}

export async function addTransaction(formData: FormData) {
  await requireSession();
  const raw = Math.abs(Number(formData.get("amount")));
  if (!Number.isFinite(raw) || raw === 0) return;
  const type = formData.get("type") === "add" ? 1 : -1;
  const clean = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    return v || null;
  };
  const { data: row } = await db()
    .from("transactions")
    .insert({
      amount: raw * type,
      place: clean("place"),
      category: clean("category")?.toLowerCase() ?? "uncategorized",
      note: clean("note"),
    })
    .select()
    .single();
  if (row) after(() => pushToSheet({ action: "add", ...sheetRow(row as Tx) }));
  revalidatePath("/");
}

export async function setStartingBalance(formData: FormData) {
  await requireSession();
  const v = Number(formData.get("starting_balance"));
  if (!Number.isFinite(v)) return;
  await db().from("settings").update({ starting_balance: v }).eq("id", 1);
  revalidatePath("/");
}

export async function deleteTransaction(formData: FormData) {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  if (id) {
    const { error } = await db().from("transactions").delete().eq("id", id);
    if (!error) after(() => pushToSheet({ action: "delete", id }));
  }
  revalidatePath("/");
}
