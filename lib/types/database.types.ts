// Mirrors supabase/migrations/*.sql. Regenerate with the Supabase CLI
// (`supabase gen types typescript`) after changing the schema.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type DocumentStatus = "processing" | "ready" | "failed";
export type ChatRole = "user" | "assistant" | "system";
export type DeckSourceType = "note" | "document" | "manual";
export type EventType =
  | "pdf_upload"
  | "pdf_processed"
  | "pdf_failed"
  | "retrieval"
  | "chat_message"
  | "flashcard_generated";

export interface Citation {
  page: number | null;
  chunkId: string;
  documentId: string;
  documentTitle?: string;
  snippet: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
        };
        Update: {
          full_name?: string | null;
          avatar_url?: string | null;
        };
        Relationships: [];
      };
      documents: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          storage_path: string;
          file_size_bytes: number | null;
          page_count: number | null;
          status: DocumentStatus;
          error_message: string | null;
          is_demo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          storage_path: string;
          file_size_bytes?: number | null;
          page_count?: number | null;
          status?: DocumentStatus;
          error_message?: string | null;
          is_demo?: boolean;
        };
        Update: {
          title?: string;
          file_size_bytes?: number | null;
          page_count?: number | null;
          status?: DocumentStatus;
          error_message?: string | null;
        };
        Relationships: [];
      };
      document_chunks: {
        Row: {
          id: string;
          document_id: string;
          user_id: string;
          chunk_index: number;
          page_number: number | null;
          content: string;
          token_count: number | null;
          embedding: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          user_id: string;
          chunk_index: number;
          page_number?: number | null;
          content: string;
          token_count?: number | null;
          embedding?: string | null;
        };
        Update: never;
        Relationships: [];
      };
      chat_conversations: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          document_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string;
          document_id?: string | null;
        };
        Update: {
          title?: string;
        };
        Relationships: [];
      };
      chat_messages: {
        Row: {
          id: string;
          conversation_id: string;
          user_id: string;
          role: ChatRole;
          content: string;
          citations: Citation[];
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          user_id: string;
          role: ChatRole;
          content: string;
          citations?: Citation[];
        };
        Update: never;
        Relationships: [];
      };
      notes: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          content_markdown: string;
          document_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string;
          content_markdown?: string;
          document_id?: string | null;
        };
        Update: {
          title?: string;
          content_markdown?: string;
        };
        Relationships: [];
      };
      flashcard_decks: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          source_type: DeckSourceType;
          source_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          source_type: DeckSourceType;
          source_id?: string | null;
        };
        Update: {
          title?: string;
        };
        Relationships: [];
      };
      flashcards: {
        Row: {
          id: string;
          deck_id: string;
          user_id: string;
          question: string;
          answer: string;
          ease_factor: number;
          interval_days: number;
          repetitions: number;
          due_at: string;
          last_reviewed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          deck_id: string;
          user_id: string;
          question: string;
          answer: string;
        };
        Update: {
          ease_factor?: number;
          interval_days?: number;
          repetitions?: number;
          due_at?: string;
          last_reviewed_at?: string | null;
        };
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          user_id: string;
          event_type: EventType;
          metadata: Json;
          duration_ms: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          event_type: EventType;
          metadata?: Json;
          duration_ms?: number | null;
        };
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      match_document_chunks: {
        Args: {
          query_embedding: string;
          match_document_id: string;
          match_count?: number;
        };
        Returns: {
          id: string;
          chunk_index: number;
          page_number: number | null;
          content: string;
          similarity: number;
        }[];
      };
      match_library_chunks: {
        Args: {
          query_embedding: string;
          match_count?: number;
        };
        Returns: {
          id: string;
          document_id: string;
          document_title: string;
          chunk_index: number;
          page_number: number | null;
          content: string;
          similarity: number;
        }[];
      };
      get_user_stats: {
        Args: Record<string, never>;
        Returns: {
          documents_ready: number;
          questions_answered: number;
          notes_count: number;
          flashcards_count: number;
          cards_due: number;
          retrieval_success_rate: number | null;
          avg_response_ms: number | null;
          avg_processing_ms: number | null;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
