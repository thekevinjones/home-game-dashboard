import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Browser Supabase client. The URL + anon key are public by design (RLS on the
// database enforces access), so they ship inlined in the client bundle via the
// NEXT_PUBLIC_* env vars — which is what makes this work on static GitHub Pages.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

export const isSupabaseConfigured = (): boolean => Boolean(url && anonKey);

export function getSupabase(): SupabaseClient {
  if (!url || !anonKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY (locally in .env.local, and as GitHub " +
        "Actions repo variables for the Pages build)."
    );
  }
  if (!client) client = createClient(url, anonKey);
  return client;
}
