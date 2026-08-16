import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types/database.types";

// Bypasses RLS. Only for privileged server work (demo seeding, ingestion
// running outside a user request); never import this from a client component.
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
