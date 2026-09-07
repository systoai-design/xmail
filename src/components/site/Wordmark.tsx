import { cn } from "@/lib/utils";

/**
 * xmail brand mark.
 *
 * Construction borrowed from the reference: a rounded-square tile carrying a
 * single geometric glyph, a small accent dot breaking the tile's top-right
 * corner, and the name set beside it with a quiet descriptor underneath.
 *
 * The glyph itself is ours: an envelope whose flap folds into the diagonal of
 * an X, so the mark reads as "mail" and "x" at once rather than as a letterform
 * borrowed from someone else's identity.
 */
export function Wordmark({
  className,
  descriptor = "Encrypted Mail",
  size = "md",
}: {
  className?: string;
  descriptor?: string | null;
  size?: "sm" | "md";
}) {
  const tile =
    size === "sm" ? "h-8 w-8 rounded-[10px]" : "h-10 w-10 rounded-xl";
  const glyph = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "relative flex shrink-0 items-center justify-center bg-white",
          tile,
        )}
      >
        <svg
          viewBox="0 0 24 24"
          className={cn("text-[#0A0A0C]", glyph)}
          aria-hidden="true"
        >
          {/* envelope body */}
          <path
            d="M3.2 6.4a1.6 1.6 0 0 1 1.6-1.6h14.4a1.6 1.6 0 0 1 1.6 1.6v11.2a1.6 1.6 0 0 1-1.6 1.6H4.8a1.6 1.6 0 0 1-1.6-1.6V6.4Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
          />
          {/* the flap, folded into an X */}
          <path
            d="M3.9 6 12 12.6 20.1 6M3.9 18l6.2-5.1M20.1 18l-6.2-5.1"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {/* the accent dot, breaking the corner */}
        <span
          className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-[hsl(var(--background))]"
          aria-hidden="true"
        />
      </span>

      <span className="flex flex-col leading-none">
        <span className="text-[15px] tracking-[-0.02em]">xmail</span>
        {descriptor && (
          <span className="text-l5 mt-1 text-[11px] tracking-[0.01em]">
            {descriptor}
          </span>
        )}
      </span>
    </span>
  );
}
