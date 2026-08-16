import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { cn } from "@/lib/utils";

interface BentoCardProps {
  title: string;
  description?: string;
  href?: string;
  icon?: React.ReactNode;
  /** Grid placement. Must land on the grid child, not an inner wrapper. */
  className?: string;
  /** Mono line at the foot of the card, in the style of a citation tag. */
  meta?: string;
  children?: React.ReactNode;
}

export function BentoCard({
  title,
  description,
  href,
  icon,
  className,
  meta,
  children,
}: BentoCardProps) {
  const body = (
    <div className="flex h-full flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {icon && <span className="text-primary/90">{icon}</span>}
          <h2 className="text-sm font-medium tracking-tight">{title}</h2>
        </div>
        {href && (
          <ArrowUpRight className="size-4 shrink-0 text-muted-foreground/60 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
        )}
      </div>

      {description && (
        <p className="-mt-2.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
      )}

      {children && <div className="min-h-0 flex-1">{children}</div>}

      {meta && <p className="mt-auto text-xs text-muted-foreground/70">{meta}</p>}
    </div>
  );

  const surface = cn(
    "group relative overflow-hidden rounded-2xl border border-border/60 bg-card/50 backdrop-blur-xl transition-colors",
    href && "hover:border-primary/40 hover:bg-card/80",
    className,
  );

  // The span utilities in `className` only take effect on the direct grid
  // child, so they belong on the Link when the card is a link.
  return href ? (
    <Link href={href} className={surface}>
      {body}
    </Link>
  ) : (
    <div className={surface}>{body}</div>
  );
}
