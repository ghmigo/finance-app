"use client";

import { useRef, useState } from "react";
import { addTransaction } from "./actions";

type PlaceChip = { name: string; category: string | null };

export default function QuickAdd({ places, categories }: { places: PlaceChip[]; categories: string[] }) {
  const [type, setType] = useState<"spend" | "add">("spend");
  const [amount, setAmount] = useState("");
  const [place, setPlace] = useState("");
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);

  async function submit(fd: FormData) {
    setSaving(true);
    try {
      await addTransaction(fd);
      setAmount("");
      setPlace("");
      setCategory("");
      setNote("");
      amountRef.current?.focus();
    } finally {
      setSaving(false);
    }
  }

  function pickPlace(p: PlaceChip) {
    const same = place.toLowerCase() === p.name.toLowerCase();
    setPlace(same ? "" : p.name);
    if (!same && !category && p.category) setCategory(p.category);
  }

  return (
    <form action={submit} className="quick">
      <input type="hidden" name="type" value={type} />

      <div className="seg" role="group" aria-label="Type">
        <button type="button" className={type === "spend" ? "on" : ""} onClick={() => setType("spend")}>
          Spend
        </button>
        <button type="button" className={type === "add" ? "on" : ""} onClick={() => setType("add")}>
          Add money
        </button>
      </div>

      <input
        ref={amountRef}
        name="amount"
        type="number"
        inputMode="decimal"
        step="0.01"
        min="0"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        autoFocus
        required
        className="amount"
      />

      <div className="label">Where</div>
      <div className="chips">
        {places.map((p) => (
          <button
            type="button"
            key={p.name}
            className={`chip${place.toLowerCase() === p.name.toLowerCase() ? " on" : ""}`}
            onClick={() => pickPlace(p)}
          >
            {p.name}
          </button>
        ))}
      </div>
      <input name="place" placeholder="Or type a new place" value={place} onChange={(e) => setPlace(e.target.value)} autoComplete="off" />

      <div className="label">Category</div>
      <div className="chips">
        {categories.map((c) => (
          <button
            type="button"
            key={c}
            className={`chip${category.toLowerCase() === c ? " on" : ""}`}
            onClick={() => setCategory(category.toLowerCase() === c ? "" : c)}
          >
            {c}
          </button>
        ))}
      </div>
      <input name="category" placeholder="Or type a new category" value={category} onChange={(e) => setCategory(e.target.value)} autoComplete="off" />

      <input name="note" placeholder="Reason / note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
      <button type="submit" className="save" disabled={saving}>
        {saving ? "Saving…" : type === "spend" ? "Save spend" : "Save deposit"}
      </button>
    </form>
  );
}
