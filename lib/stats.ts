export type Row = { place: string | null; category: string; amount: number | string };

export type PlaceStat = {
  name: string; // most common spelling
  count: number; // how many entries use this place
  spendCategory: string | null; // category of the newest spend here
  anyCategory: string | null; // category of the newest entry here
};

export type Stats = { places: PlaceStat[]; categories: string[] };

const BLANK = "uncategorized";

// rows must be sorted newest first.
// Places that differ only in capitalisation or apostrophes are treated as one place.
export function buildStats(rows: Row[]): Stats {
  const placeMap = new Map<
    string,
    { variants: Map<string, number>; count: number; spend: string | null; any: string | null }
  >();
  const catMap = new Map<string, number>();

  for (const r of rows) {
    const cat = r.category?.trim().toLowerCase();
    const usable = cat && cat !== BLANK ? cat : null;
    if (usable) catMap.set(usable, (catMap.get(usable) ?? 0) + 1);

    const p = r.place?.trim();
    if (!p) continue;
    const key = p.toLowerCase().replace(/['’]/g, "");
    const e = placeMap.get(key) ?? { variants: new Map(), count: 0, spend: null, any: null };
    e.variants.set(p, (e.variants.get(p) ?? 0) + 1);
    e.count += 1;
    if (!e.any && usable) e.any = usable;
    if (!e.spend && usable && Number(r.amount) < 0) e.spend = usable;
    placeMap.set(key, e);
  }

  const places = [...placeMap.values()]
    .map((e) => ({
      name: [...e.variants.entries()].sort((a, b) => b[1] - a[1])[0][0],
      count: e.count,
      spendCategory: e.spend,
      anyCategory: e.any,
    }))
    .sort((a, b) => b.count - a.count);

  const categories = [...catMap.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
  return { places, categories };
}
