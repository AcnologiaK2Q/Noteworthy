"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft } from "lucide-react";
import { toast } from "sonner";

import { Markdown } from "@/components/Markdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ChatMessage } from "@/lib/ai/provider";
import { cn } from "@/lib/utils";

interface ChatWindowProps {
  conversationId: string;
  initialMessages: ChatMessage[];
}

export function ChatWindow({ conversationId, initialMessages }: ChatWindowProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  async function send() {
    const question = input.trim();
    if (!question || streaming) return;

    const next: ChatMessage[] = [...messages, { role: "user", content: question }];
    setMessages(next);
    setInput("");
    setStreaming(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, messages: next }),
      });

      if (!response.ok || !response.body) {
        const { error } = await response.json().catch(() => ({ error: null }));
        throw new Error(error ?? "The model did not respond.");
      }

      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
      let assistant = "";

      setMessages([...next, { role: "assistant", content: "" }]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        assistant += value;
        setMessages([...next, { role: "assistant", content: assistant }]);
      }

      // Conversation titles are set server-side on the first exchange.
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong.");
      setMessages(messages);
      setInput(question);
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 md:px-6">
          {messages.length === 0 && (
            <p className="pt-16 text-center text-sm text-muted-foreground">
              Ask a research question to get started.
            </p>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-3",
                  message.role === "user"
                    ? "bg-primary/20 text-sm"
                    : "border border-border/70 bg-card/60",
                )}
              >
                {message.role === "user" ? (
                  <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                ) : (
                  <Markdown>{message.content || "…"}</Markdown>
                )}
              </div>
            </div>
          ))}

          <div ref={bottomRef} />
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        className="border-t border-border p-4"
      >
        <div className="relative mx-auto max-w-3xl">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            placeholder="Ask a research question…"
            rows={2}
            disabled={streaming}
            className="resize-none pr-12"
          />
          <Button
            type="submit"
            size="icon"
            className="absolute bottom-2 right-2 size-8"
            disabled={streaming || !input.trim()}
            aria-label="Send message"
          >
            <CornerDownLeft className="size-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
