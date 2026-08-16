import type { Metadata } from "next";

import { AuthForm } from "@/features/auth/components/AuthForm";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string };
}) {
  return (
    <>
      <header className="mb-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sign in to your research workspace.</p>
      </header>

      {searchParams.error && (
        <p role="alert" className="mb-4 rounded-lg bg-destructive/15 p-3 text-sm text-destructive">
          {searchParams.error}
        </p>
      )}

      <AuthForm mode="login" next={searchParams.next} />
    </>
  );
}
