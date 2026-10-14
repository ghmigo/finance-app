import { cookies } from "next/headers";
import { db, type Tx } from "@/lib/supabase";
import { safeEqual, sessionValue } from "@/lib/auth";
import { addTransaction, deleteTransaction, login, logout, setStartingBalance } from "./actions";

export const dynamic = "force-dynamic";

const fmt = (n: number) =>
  n.toLocaleString("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 2 });

export default async function Home() {
  const session = (await cookies()).get("session")?.value ?? "";
  const authed = !!session && !!process.env.DASHBOARD_PASSWORD && safeEqual(session, sessionValue());

  if (!authed) {
    return (
      <main>
        <h1>Finance</h1>
        <form action={login} className="card" style={{ display: "grid", gap: 8 }}>
          <input type="password" name="password" placeholder="Password" autoFocus required />
          <button type="submit">Unlock</button>
        </form>
      </main>
    );
  }

  const supabase = db();
  const [{ data: bal }, { data: settings }, { data: txs }] = await Promise.all([
    supabase.from("balance").select("balance").single(),
    supabase.from("settings").select("starting_balance").eq("id", 1).single(),
    supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(500),
  ]);
  const rows = (txs ?? []) as Tx[];
  const balance = Number(bal?.balance ?? 0);

  const cats = new Map<string, number>();
  const places = new Map<string, number>();
  for (const r of rows) {
    const a = Number(r.amount);
    if (a >= 0) continue;
    cats.set(r.category, (cats.get(r.category) ?? 0) - a);
    const p = r.place ?? "(none)";
    places.set(p, (places.get(p) ?? 0) - a);
  }
  const top = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const catTop = top(cats);
  const placeTop = top(places);
  const maxCat = catTop[0]?.[1] ?? 1;

  return (
    <main>
      <div className="row">
        <h1>Balance</h1>
        <div className="row">
          <a className="btn" href="/api/export">Export .xlsx</a>
          <form action={logout}><button style={{ width: "auto", background: "transparent", color: "var(--muted)", border: "1px solid var(--line)" }}>Lock</button></form>
        </div>
      </div>
      <p className="balance">{fmt(balance)}</p>

      <section className="card">
        <h2>Quick add</h2>
        <form action={addTransaction} className="add">
          <input name="amount" type="number" step="0.01" min="0" placeholder="Amount" required />
          <select name="type" defaultValue="spend">
            <option value="spend">Spend</option>
            <option value="add">Add money</option>
          </select>
          <input name="place" placeholder="Where (e.g. 7-Eleven)" />
          <input name="category" placeholder="Category (food, transport…)" list="cats" />
          <datalist id="cats">{[...cats.keys()].map((c) => <option key={c} value={c} />)}</datalist>
          <input className="full" name="note" placeholder="Reason / note" />
          <button className="full" type="submit">Save</button>
        </form>
      </section>

      <section className="card">
        <h2>Spending by category</h2>
        {catTop.length === 0 && <p className="muted">No spending yet.</p>}
        {catTop.map(([c, v]) => (
          <div key={c} style={{ marginBottom: 10 }}>
            <div className="row"><span>{c}</span><span className="num">{fmt(v)}</span></div>
            <div className="bar"><i style={{ width: `${(v / maxCat) * 100}%` }} /></div>
          </div>
        ))}
      </section>

      <section className="card">
        <h2>Top places</h2>
        {placeTop.length === 0 && <p className="muted">No spending yet.</p>}
        {placeTop.map(([p, v]) => (
          <div key={p} className="row"><span>{p}</span><span>{fmt(v)}</span></div>
        ))}
      </section>

      <section className="card">
        <h2>Recent</h2>
        <table>
          <thead><tr><th>When</th><th>What</th><th className="num">Amount</th><th></th></tr></thead>
          <tbody>
            {rows.slice(0, 30).map((r) => (
              <tr key={r.id}>
                <td className="muted">{new Date(r.created_at).toLocaleDateString("en-PH", { month: "short", day: "numeric", timeZone: "Asia/Manila" })}</td>
                <td>{r.category}<div className="muted">{[r.place, r.note].filter(Boolean).join(" · ")}</div></td>
                <td className={`num ${Number(r.amount) < 0 ? "neg" : "pos"}`}>{fmt(Number(r.amount))}</td>
                <td>
                  <form action={deleteTransaction}>
                    <input type="hidden" name="id" value={r.id} />
                    <button aria-label="Delete" style={{ width: "auto", padding: "2px 8px", background: "transparent", color: "var(--muted)", border: "1px solid var(--line)" }}>×</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2>Starting balance</h2>
        <form action={setStartingBalance} className="row">
          <input name="starting_balance" type="number" step="0.01" defaultValue={Number(settings?.starting_balance ?? 0)} />
          <button style={{ width: "auto" }}>Set</button>
        </form>
      </section>
    </main>
  );
}
