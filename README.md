# Finance

Personal finance tracker: Next.js on Vercel, Postgres on Supabase.

## Env vars (Vercel → Project → Settings → Environment Variables)

| Name | Value |
|---|---|
| `SUPABASE_URL` | `https://aoqbahvjmdrlhplcnwbw.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API Keys → `service_role` (secret) |
| `API_TOKEN` | any long random string (used by the iOS Shortcut) |
| `DASHBOARD_PASSWORD` | password for the web dashboard |

Generate a token: `openssl rand -hex 32`

## API

`POST /api/transactions` with header `Authorization: Bearer <API_TOKEN>`

```json
{ "amount": 150, "type": "spend", "place": "7-Eleven", "category": "food", "note": "snack" }
```

`type` is `"spend"` (default) or `"add"`. Returns `{ "ok": true, "balance": 1234.5 }`.
`GET /api/transactions` returns the current balance. `GET /api/export` downloads the `.xlsx`
(token header or dashboard login).

## iOS Shortcut

1. Shortcuts → New Shortcut → **Ask for Input** (Number) "Amount".
2. **Choose from Menu**: Spend / Add (sets `type`).
3. **Ask for Input** (Text) "Where?" and **Choose from List** for category.
4. **Get Contents of URL**: `https://<your-app>.vercel.app/api/transactions`, Method `POST`,
   Headers `Authorization: Bearer <API_TOKEN>`, Request Body `JSON` with the fields above.
5. **Get Dictionary Value** `balance` → **Show Notification**.
6. Add it to the Home Screen / Lock Screen widget, Action Button, or Back Tap.
   For one-tap buttons, make duplicates with fixed values (e.g. "Coffee 150").

## Database

Schema lives in Supabase (`transactions`, `settings`, `balance` view). RLS is on with no
policies, so only the server-side service key can read or write.

## Google Sheet sync

Every new entry (from the Shortcut or the dashboard) is appended to the "Finance Tracker" sheet's
`Log` tab within a few seconds. Deleting an entry in the dashboard removes its row too.
The `Places` tab feeds the dropdown on the Place column, and `Summary` totals everything with formulas.

One-time setup:

1. Open the sheet → Extensions → Apps Script. Replace the contents with `apps-script/Code.gs`.
2. Project Settings → Script properties → add `SECRET` with a long random value.
3. Deploy → New deployment → type **Web app**, Execute as **Me**, Who has access **Anyone**. Copy the URL.
4. In Vercel, add `SHEETS_WEBHOOK_URL` (that URL) and `SHEETS_WEBHOOK_SECRET` (the same value as `SECRET`),
   then redeploy.

`POST /api/sheets/sync` with the bearer token re-sends every transaction. The script skips IDs it already has,
so it only fills gaps. The sheet is a mirror: edits made in the sheet do not flow back to the app.

## Easiest setup (iPhone)

### Home Screen app

Open the site in Safari → Share → **Add to Home Screen**. It opens full screen with its own icon and stays
signed in for 180 days. Tap a place and a category chip, type the amount, save.

### Two-action Shortcut: type one line

`POST /api/quick` with `{ "text": "150 zus coffee" }` and the usual bearer token.

| You type | Saved as |
|---|---|
| `150 zus coffee` | spend 150, place Zus Coffee, category from past Zus Coffee entries |
| `+1500 papa` | money in 1500, place Papa, category allowance |
| `17 nanay's coke` | spend 17, place Nanay's, note "coke" |
| `85 mapua jamaica beef` | spend 85, place Mapua, note "jamaica beef" |
| `99 transport grab` | spend 99, category transport, note "grab" |

Rules: the first number is the amount. `+` (or the word `add`) means money in. Known places match by full name
or by the start of the first word (`zus`, `burger`). A known category word sets the category. Anything left over
becomes the note. Add `"dryRun": true` to see how a line would be read without saving it.

The response includes `message` (summary and new balance) for a notification.

Shortcut: **Ask for Input** (Text) → **Get Contents of URL** (`https://<your-app>.vercel.app/api/quick`,
POST, header `Authorization: Bearer <API_TOKEN>`, JSON body `text` = Provided Input) →
**Get Dictionary Value** `message` → **Show Notification**.
