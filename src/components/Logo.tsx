import { cn } from "@/lib/utils";

/**
 * The xmail mark, used in app chrome.
 *
 * Draws the same glyph as Wordmark.tsx (an envelope whose flap folds into the
 * diagonal of an X) rather than loading a raster. Previously this pulled a PNG
 * that was byte-identical to the favicon and every other icon in the project,
 * so it could not be resized cleanly or recoloured with the theme.
 */

interface LogoProps {
  size?: "small" | "medium" | "large";
  className?: string;
  /** Show the "xmail" wordmark beside the tile. */
  withText?: boolean;
}

const TILE = {
  small: "h-8 w-8 rounded-[10px]",
  medium: "h-10 w-10 rounded-xl",
  large: "h-14 w-14 rounded-2xl",
} as const;

const GLYPH = {
  small: "h-4 w-4",
  medium: "h-5 w-5",
  large: "h-7 w-7",
} as const;

const TEXT = {
  small: "text-sm",
  medium: "text-base",
  large: "text-xl",
} as const;

export const Logo = ({ size = "medium", className = "", withText = false }: LogoProps) => (
  <span className={cn("inline-flex items-center gap-2.5", className)}>
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center bg-white",
        TILE[size],
      )}
    >
      <svg viewBox="0 0 24 24" className={cn("text-[#0A0A0C]", GLYPH[size])} aria-hidden="true">
        <path
          d="M3.2 6.4a1.6 1.6 0 0 1 1.6-1.6h14.4a1.6 1.6 0 0 1 1.6 1.6v11.2a1.6 1.6 0 0 1-1.6 1.6H4.8a1.6 1.6 0 0 1-1.6-1.6V6.4Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <path
          d="M3.9 6 12 12.6 20.1 6M3.9 18l6.2-5.1M20.1 18l-6.2-5.1"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span
        aria-hidden="true"
        className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-[hsl(var(--background))]"
      />
    </span>
    {withText && (
      <span className={cn("tracking-[-0.02em]", TEXT[size])}>xmail</span>
    )}
  </span>
);

export default Logo;
