import { createClient } from "@supabase/supabase-js";

export function db() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // server-only
    { auth: { persistSession: false } }
  );
}

export type Tx = {
  id: string;
  amount: number;
  place: string | null;
  category: string;
  note: string | null;
  created_at: string;
};
