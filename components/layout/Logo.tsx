import { cn } from "@/lib/utils";

/**
 * The mark is a page with a single line picked out: the cited passage an
 * answer points back to, which is the whole idea of the product.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-[0.6rem] bg-primary text-primary-foreground",
        className,
      )}
    >
      <svg viewBox="0 0 20 20" className="size-[1.15rem]" aria-hidden="true">
        <rect
          x="4.25"
          y="2.5"
          width="11.5"
          height="15"
          rx="1.6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          opacity="0.55"
        />
        <path
          d="M7.4 7h5.2M7.4 13h3.4"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          opacity="0.55"
        />
        {/* The marked line sits proud of the others. */}
        <path d="M7.4 10h5.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      {!compact && (
        <span className="text-lg font-semibold tracking-tight">Noteworthy</span>
      )}
    </span>
  );
}
