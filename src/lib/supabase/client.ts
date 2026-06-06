import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const isConfigured = supabaseUrl.startsWith("http");

export function createClient() {
  if (!isConfigured) {
    // Return a mock-like client that won't crash when Supabase isn't configured
    return createBrowserClient(
      "http://localhost:54321",
      "placeholder-key-for-dev"
    );
  }
  return createBrowserClient(supabaseUrl, supabaseKey);
}

export { isConfigured as isSupabaseConfigured };
