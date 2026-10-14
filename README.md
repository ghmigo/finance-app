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
