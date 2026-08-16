import Link from "next/link";

import { Logo } from "@/components/layout/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-aurora flex min-h-dvh flex-col items-center justify-center px-6 py-12">
      <Link href="/" className="mb-10">
        <Logo animate className="text-2xl" />
      </Link>

      <main className="glass w-full max-w-md rounded-2xl p-8 shadow-glow">{children}</main>

      <p className="mt-8 max-w-md text-center text-xs text-muted-foreground">
        Noteworthy stores your papers privately. Every row is scoped to your account by
        database-level row security.
      </p>
    </div>
  );
}
