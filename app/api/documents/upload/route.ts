import { NextResponse, type NextRequest } from "next/server";

import { ingestDocument } from "@/features/documents/pipeline/ingestDocument";
import { createClient } from "@/lib/supabase/server";

// Extraction plus embedding for a full paper exceeds the default budget. 60s is
// the ceiling on Vercel's Hobby plan; raise this alongside the plan if large
// papers start timing out during ingestion.
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { documentId } = (await request.json()) as { documentId?: string };

  if (!documentId) {
    return NextResponse.json({ error: "documentId is required." }, { status: 400 });
  }

  const { data: doc } = await supabase
    .from("documents")
    .select("id, user_id, storage_path")
    .eq("id", documentId)
    .maybeSingle();

  if (!doc || doc.user_id !== user.id) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  try {
    const result = await ingestDocument({
      supabase,
      userId: user.id,
      documentId: doc.id,
      storagePath: doc.storage_path,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Processing failed." },
      { status: 500 },
    );
  }
}
