import type { PlaceStat } from "./stats";

export type Parsed = {
  amount: number;
  type: "spend" | "add";
  place: string | null;
  category: string;
  note: string | null;
};

// "150 zus coffee"        -> spend 150, place Zus Coffee, category from past Zus Coffee entries
// "+1500 papa allowance"  -> add 1500, place Papa, category allowance
// "85 mapua jamaica beef" -> spend 85, place Mapua, note "jamaica beef"
// The first number is the amount. A "+" in front of it (or the word "add") means money in.

const words = (s: string) =>
  s
    .toLowerCase()
    .replace(/['’]/g, "")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

export function parseQuick(text: string, places: PlaceStat[], categories: string[]): Parsed | null {
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  const used = new Set<number>();
  let type: "spend" | "add" = "spend";
  let amount: number | null = null;

  for (let i = 0; i < tokens.length; i++) {
    const m = tokens[i].match(/^([+-]?)₱?(\d[\d,]*(?:\.\d+)?)(?:php|pesos?)?$/i);
    if (m) {
      amount = Number(m[2].replace(/,/g, ""));
      if (m[1] === "+") type = "add";
      used.add(i);
      break;
    }
  }
  if (amount === null || !Number.isFinite(amount) || amount <= 0) return null;

  tokens.forEach((t, i) => {
    const lower = t.toLowerCase();
    if (!used.has(i) && (t === "+" || lower === "add")) {
      type = "add";
      used.add(i);
    }
  });

  // One entry per word, remembering which original token it came from.
  const units: { w: string; i: number }[] = [];
  tokens.forEach((t, i) => {
    if (!used.has(i)) words(t).forEach((w) => units.push({ w, i }));
  });
  const free = () => units.filter((u) => !used.has(u.i));

  // 1. A known place written out in full (longest wins, then most used).
  let place: PlaceStat | null = null;
  let bestLen = 0;
  let matched: number[] = [];
  const f = free();
  for (const p of places) {
    const pw = words(p.name);
    if (pw.length === 0 || pw.length <= bestLen) continue; // ties keep the more used place
    for (let s = 0; s + pw.length <= f.length; s++) {
      if (pw.every((w, k) => f[s + k].w === w)) {
        place = p;
        bestLen = pw.length;
        matched = f.slice(s, s + pw.length).map((u) => u.i);
        break;
      }
    }
  }
  matched.forEach((i) => used.add(i));

  // 2. A known category word.
  let category: string | null = null;
  for (const u of free()) {
    if (categories.includes(u.w)) {
      category = u.w;
      used.add(u.i);
      break;
    }
  }

  // 3. Otherwise a short form of a place, like "zus" for "Zus Coffee".
  if (!place) {
    for (const u of free()) {
      if (u.w.length < 3) continue;
      const hit = places.find((p) => (words(p.name)[0] ?? "").startsWith(u.w));
      if (hit) {
        place = hit;
        used.add(u.i);
        break;
      }
    }
  }

  if (!category && place) {
    category = type === "add" ? place.anyCategory : (place.spendCategory ?? place.anyCategory);
  }

  const note = tokens.filter((_, i) => !used.has(i)).join(" ").trim();
  return {
    amount,
    type,
    place: place ? place.name : null,
    category: category ?? "uncategorized",
    note: note || null,
  };
}
