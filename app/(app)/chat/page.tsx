import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquare } from "lucide-react";

import { NewChatButton } from "@/features/chat/components/NewChatButton";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Chat" };

export default async function ChatPage() {
  const supabase = createClient();

  const { data: conversations } = await supabase
    .from("chat_conversations")
    .select("id, title, updated_at")
    .is("document_id", null)
    .order("updated_at", { ascending: false });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Chat</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            General research questions. For questions about a specific paper, open it from Papers.
          </p>
        </div>
        <NewChatButton />
      </header>

      {!conversations || conversations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <MessageSquare className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">No conversations yet.</p>
        </div>
      ) : (
        <ul className="grid gap-2">
          {conversations.map((conversation) => (
            <li key={conversation.id}>
              <Link
                href={`/chat/${conversation.id}`}
                className="block truncate rounded-xl border border-border/70 bg-card/60 p-4 text-sm transition-colors hover:border-primary/50"
              >
                {conversation.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
