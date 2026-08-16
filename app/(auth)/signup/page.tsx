import type { Metadata } from "next";

import { AuthForm } from "@/features/auth/components/AuthForm";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage({ searchParams }: { searchParams: { next?: string } }) {
  return (
    <>
      <header className="mb-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Create your workspace</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload papers, ask questions, keep the evidence.
        </p>
      </header>

      <AuthForm mode="signup" next={searchParams.next} />
    </>
  );
}
