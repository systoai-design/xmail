import { forwardRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Primary CTA.
 *
 * Mechanics from the supplied component: a layered gradient body built from two
 * inset pseudo-elements, ten rising particles, and an arrow whose stroke draws
 * itself on hover. Recoloured to xmail's achromatic palette -- a near-black body
 * lit from below by white bloom, rather than the original's blue/cyan.
 *
 * Deliberately no hover transform. The page already moves a lot, and a CTA that
 * jumps under the pointer is the thing that makes a page feel unsteady. Press
 * feedback stays (scale 0.97), because that one is causal.
 */

export interface GlowButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  withArrow?: boolean;
}

const POINTS = Array.from({ length: 10 });

export const GlowButton = forwardRef<HTMLButtonElement, GlowButtonProps>(
  ({ children, className, withArrow = true, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn("glow-btn", className)}
      {...props}
    >
      <span className="glow-btn__points" aria-hidden="true">
        {POINTS.map((_, i) => (
          <i key={i} className="glow-btn__point" />
        ))}
      </span>

      <span className="glow-btn__inner">
        {children}
        {withArrow && (
          <svg
            className="glow-btn__icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        )}
      </span>
    </button>
  ),
);

GlowButton.displayName = "GlowButton";
