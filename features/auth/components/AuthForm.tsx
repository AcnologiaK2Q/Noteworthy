"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, signUp, type AuthFormState } from "@/features/auth/actions";

import { OAuthButtons } from "./OAuthButtons";

const INITIAL: AuthFormState = { error: null, message: null };

export function AuthForm({ mode, next }: { mode: "login" | "signup"; next?: string }) {
  const action = mode === "login" ? signIn : signUp;
  const [state, formAction] = useFormState(action, INITIAL);

  return (
    <div className="grid gap-6">
      <OAuthButtons next={next} />

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-widest text-muted-foreground">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <form action={formAction} className="grid gap-4">
        {mode === "signup" && (
          <div className="grid gap-2">
            <Label htmlFor="fullName">Name</Label>
            <Input id="fullName" name="fullName" autoComplete="name" placeholder="Ada Lovelace" />
          </div>
        )}

        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@university.edu"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder={mode === "signup" ? "At least 8 characters" : "••••••••"}
          />
        </div>

        {state.error && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}
        {state.message && <p className="text-sm text-success">{state.message}</p>}

        <SubmitButton mode={mode} />
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {mode === "login" ? (
          <>
            No account yet?{" "}
            <Link href="/signup" className="text-secondary underline-offset-4 hover:underline">
              Create one
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href="/login" className="text-secondary underline-offset-4 hover:underline">
              Sign in
            </Link>
          </>
        )}
      </p>
    </div>
  );
}

function SubmitButton({ mode }: { mode: "login" | "signup" }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="h-11 w-full" disabled={pending}>
      {pending ? "Working…" : mode === "login" ? "Sign in" : "Create account"}
    </Button>
  );
}
