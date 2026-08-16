import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, EventType, Json } from "@/lib/types/database.types";

interface LogEventArgs {
  supabase: SupabaseClient<Database>;
  userId: string;
  type: EventType;
  durationMs?: number;
  metadata?: Record<string, Json>;
}

/**
 * Instrumentation must never break the feature it measures, so failures here
 * are swallowed rather than propagated.
 */
export async function logEvent({
  supabase,
  userId,
  type,
  durationMs,
  metadata,
}: LogEventArgs): Promise<void> {
  try {
    await supabase.from("events").insert({
      user_id: userId,
      event_type: type,
      duration_ms: durationMs ?? null,
      metadata: (metadata ?? {}) as Json,
    });
  } catch {
    // Intentionally ignored.
  }
}

export function startTimer(): () => number {
  const started = Date.now();
  return () => Date.now() - started;
}
