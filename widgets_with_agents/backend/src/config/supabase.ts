import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import { Agent, fetch as undiciFetch } from "undici";

const supabaseUrl = (process.env.SUPABASE_URL ?? "").trim();
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

const isPlaceholder =
  !supabaseUrl ||
  !supabaseServiceKey ||
  supabaseUrl.includes("your-project") ||
  supabaseServiceKey.toLowerCase().includes("your-");

export function isSupabaseConfigured(): boolean {
  return !isPlaceholder;
}

if (isPlaceholder) {
  console.warn(
    "\n⚠️  Supabase not configured. In backend/.env set:\n" +
      "   SUPABASE_URL=https://<your-project-ref>.supabase.co\n" +
      "   SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>\n" +
      "   (Supabase Dashboard → Project Settings → API)\n" +
      "   Auth and profile APIs will return 503 until configured.\n"
  );
}

// Custom fetch with 30s connect timeout (Node default is 10s; often too short on slow or IPv6 networks)
const supabaseDispatcher = new Agent({
  connectTimeout: 30_000,
});
const supabaseFetch: typeof fetch = (input, init) =>
  undiciFetch(input as Parameters<typeof undiciFetch>[0], { ...init, dispatcher: supabaseDispatcher } as Parameters<typeof undiciFetch>[1]) as ReturnType<typeof fetch>;

export const supabaseAdmin: SupabaseClient | null = isPlaceholder
  ? null
  : createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { fetch: supabaseFetch },
    });
