import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types/database.types";

export interface UserStats {
  documentsReady: number;
  questionsAnswered: number;
  notesCount: number;
  flashcardsCount: number;
  cardsDue: number;
  /** null until at least one retrieval has run; the UI renders N/A. */
  retrievalSuccessRate: number | null;
  avgResponseMs: number | null;
  avgProcessingMs: number | null;
}

const EMPTY: UserStats = {
  documentsReady: 0,
  questionsAnswered: 0,
  notesCount: 0,
  flashcardsCount: 0,
  cardsDue: 0,
  retrievalSuccessRate: null,
  avgResponseMs: null,
  avgProcessingMs: null,
};

export async function getUserStats(supabase: SupabaseClient<Database>): Promise<UserStats> {
  const { data, error } = await supabase.rpc("get_user_stats");

  if (error || !data || data.length === 0) return EMPTY;

  const row = data[0];

  return {
    documentsReady: row.documents_ready ?? 0,
    questionsAnswered: row.questions_answered ?? 0,
    notesCount: row.notes_count ?? 0,
    flashcardsCount: row.flashcards_count ?? 0,
    cardsDue: row.cards_due ?? 0,
    retrievalSuccessRate: row.retrieval_success_rate,
    avgResponseMs: row.avg_response_ms,
    avgProcessingMs: row.avg_processing_ms,
  };
}
