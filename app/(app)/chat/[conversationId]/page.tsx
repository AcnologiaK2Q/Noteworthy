import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ChatWindow } from "@/features/chat/components/ChatWindow";
import { createClient } from "@/lib/supabase/server";
import type { ChatMessage } from "@/lib/ai/provider";

interface PageProps {
  params: { conversationId: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const supabase = createClient();
  const { data } = await supabase
    .from("chat_conversations")
    .select("title")
    .eq("id", params.conversationId)
    .maybeSingle();

  return { title: data?.title ?? "Chat" };
}

export default async function ConversationPage({ params }: PageProps) {
  const supabase = createClient();

  const { data: conversation } = await supabase
    .from("chat_conversations")
    .select("id, title")
    .eq("id", params.conversationId)
    .maybeSingle();

  if (!conversation) notFound();

  const { data: messages } = await supabase
    .from("chat_messages")
    .select("role, content")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: true });

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3 md:px-6">
        <Button asChild variant="ghost" size="icon" className="shrink-0">
          <Link href="/chat" aria-label="Back to conversations">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <h1 className="truncate text-sm font-medium">{conversation.title}</h1>
      </header>

      <ChatWindow
        conversationId={conversation.id}
        initialMessages={(messages ?? []) as ChatMessage[]}
      />
    </div>
  );
}
