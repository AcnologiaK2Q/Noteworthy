import { NextResponse, type NextRequest } from "next/server";
import { streamText } from "ai";

import { getLLMProvider } from "@/lib/ai";
import { CHAT_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { logEvent, startTimer } from "@/lib/observability";
import { createClient } from "@/lib/supabase/server";
import type { ChatMessage } from "@/lib/ai/provider";

export const maxDuration = 60;

const TITLE_MAX_LENGTH = 60;

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { conversationId, messages } = (await request.json()) as {
    conversationId?: string;
    messages?: ChatMessage[];
  };

  if (!conversationId || !messages?.length) {
    return NextResponse.json(
      { error: "conversationId and messages are required." },
      { status: 400 },
    );
  }

  const { data: conversation } = await supabase
    .from("chat_conversations")
    .select("id, title")
    .eq("id", conversationId)
    .maybeSingle();

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  const lastUserMessage = messages.filter((m) => m.role === "user").at(-1);
  if (!lastUserMessage) {
    return NextResponse.json({ error: "No user message to answer." }, { status: 400 });
  }

  const elapsed = startTimer();

  const result = streamText({
    model: getLLMProvider().model(),
    system: CHAT_SYSTEM_PROMPT,
    messages,
    temperature: 0.4,
    async onFinish({ text }) {
      await supabase.from("chat_messages").insert([
        {
          conversation_id: conversationId,
          user_id: user.id,
          role: "user",
          content: lastUserMessage.content,
        },
        {
          conversation_id: conversationId,
          user_id: user.id,
          role: "assistant",
          content: text,
        },
      ]);

      // First exchange names the conversation so the sidebar isn't all "New chat".
      if (conversation.title === "New chat") {
        await supabase
          .from("chat_conversations")
          .update({ title: lastUserMessage.content.slice(0, TITLE_MAX_LENGTH) })
          .eq("id", conversationId);
      }

      await logEvent({
        supabase,
        userId: user.id,
        type: "chat_message",
        durationMs: elapsed(),
        metadata: { conversationId, scope: "general" },
      });
    },
  });

  return result.toTextStreamResponse();
}
