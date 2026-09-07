import { Rocket } from "lucide-react";
import xLogo from "@/assets/x-logo.png";
import { cn } from "@/lib/utils";

interface SocialLinksProps {
  className?: string;
}

/**
 * Hover here is opacity only.
 *
 * These previously scaled 110% and counter-rotated 6deg on hover, which is the
 * same "moves toward the cursor" behaviour that made the CTAs feel unsteady.
 */
const LINK_CLASS =
  "opacity-60 transition-opacity duration-200 hover:opacity-100 focus-visible:opacity-100";

export const SocialLinks = ({ className = "" }: SocialLinksProps) => (
  <div className={cn("flex items-center gap-3", className)}>
    <a
      href="https://x.com/xmail402"
      target="_blank"
      rel="noopener noreferrer"
      className={LINK_CLASS}
      aria-label="xmail on X"
    >
      <img src={xLogo} alt="" aria-hidden="true" className="h-5 w-5 sm:h-6 sm:w-6" />
    </a>

    {/* Neutral icon rather than the destination's own mark: showing one brand's
        logo on a link that goes somewhere else misrepresents where it leads. */}
    <a
      href="https://www.ponsfamily.com/launchpad"
      target="_blank"
      rel="noopener noreferrer"
      className={cn(LINK_CLASS, "text-foreground")}
      aria-label="Pons Family Launchpad"
    >
      <Rocket className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.5} />
    </a>
  </div>
);
