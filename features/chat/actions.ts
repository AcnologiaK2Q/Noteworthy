"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function createConversation(): Promise<{ id?: string; error?: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not signed in." };

  const { data, error } = await supabase
    .from("chat_conversations")
    .insert({ user_id: user.id })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/chat");
  return { id: data.id };
}

export async function deleteConversation(id: string): Promise<{ error?: string }> {
  const supabase = createClient();
  const { error } = await supabase.from("chat_conversations").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/chat");
  return {};
}
