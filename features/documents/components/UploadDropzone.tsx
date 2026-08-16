"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { createDocumentRecord } from "@/features/documents/actions";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const MAX_BYTES = 25 * 1024 * 1024;

export function UploadDropzone() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    if (file.type !== "application/pdf") {
      toast.error("Only PDF files are supported.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("That file is larger than 25 MB.");
      return;
    }

    setBusy(true);
    const title = file.name.replace(/\.pdf$/i, "");

    try {
      const { data, error } = await createDocumentRecord(title, file.name, file.size);
      if (error || !data) throw new Error(error ?? "Could not start the upload.");

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(data.storagePath, file, { contentType: "application/pdf" });

      if (uploadError) throw new Error(uploadError.message);

      toast.info("Extracting text and building the search index…");

      const response = await fetch("/api/documents/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: data.documentId }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Processing failed.");

      toast.success(`Ready. ${result.chunkCount} passages indexed.`);
      router.push(`/documents/${data.documentId}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) void handleFile(file);
      }}
      className={cn(
        "rounded-2xl border border-dashed p-8 text-center transition-colors",
        dragging ? "border-primary bg-primary/10" : "border-border bg-card/40",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />

      {busy ? (
        <Loader2 className="mx-auto size-6 animate-spin text-primary" />
      ) : (
        <Upload className="mx-auto size-6 text-muted-foreground" />
      )}

      <p className="mt-3 text-sm font-medium">
        {busy ? "Processing your paper…" : "Drop a research paper here"}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">PDF with selectable text, up to 25 MB</p>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-4"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        Choose file
      </Button>
    </div>
  );
}
