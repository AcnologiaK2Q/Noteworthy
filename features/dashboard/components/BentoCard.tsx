import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { cn } from "@/lib/utils";

interface BentoCardProps {
  title: string;
  description?: string;
  href?: string;
  icon?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

export function BentoCard({
  title,
  description,
  href,
  icon,
  className,
  children,
}: BentoCardProps) {
  const content = (
    <div
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card/70 p-5 backdrop-blur-xl transition-all",
        href && "hover:border-primary/50 hover:shadow-glow",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {icon && <span className="text-primary">{icon}</span>}
          <h2 className="text-sm font-medium tracking-tight">{title}</h2>
        </div>
        {href && (
          <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
        )}
      </div>

      {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}

      {children && <div className="mt-auto pt-4">{children}</div>}
    </div>
  );

  return href ? (
    <Link href={href} className="h-full">
      {content}
    </Link>
  ) : (
    content
  );
}

export function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card/70 p-5 backdrop-blur-xl">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 font-mono text-3xl tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
