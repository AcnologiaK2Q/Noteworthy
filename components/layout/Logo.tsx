import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  /** Draws the highlighter stroke on mount. For hero placements only. */
  animate?: boolean;
}

/**
 * The wordmark is the identity: the second half of the name sits under a
 * highlighter stroke, the same mark the product puts on cited passages.
 */
export function Logo({ className, animate = false }: LogoProps) {
  return (
    <span
      className={cn(
        "inline-flex items-baseline text-lg font-semibold tracking-tight text-foreground",
        className,
      )}
    >
      Note
      <span className={cn("marker", animate && "marker-draw")}>worthy</span>
    </span>
  );
}
