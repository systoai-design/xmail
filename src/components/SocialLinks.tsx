import xLogo from "@/assets/x-logo.png";
import ponsLogo from "@/assets/pons-logo.png";
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
      href="https://x.com/xmail__official"
      target="_blank"
      rel="noopener noreferrer"
      className={LINK_CLASS}
      aria-label="xmail on X"
    >
      <img src={xLogo} alt="" aria-hidden="true" className="h-5 w-5 sm:h-6 sm:w-6" />
    </a>

    {/* Their actual mark, because this link actually goes to them. The
        launchpad URL is deliberately not used yet -- nothing has launched, and
        pointing at a page that is not ready is worse than pointing at the
        homepage. */}
    <a
      href="https://www.ponsfamily.com/"
      target="_blank"
      rel="noopener noreferrer"
      className={LINK_CLASS}
      aria-label="Pons"
    >
      <img src={ponsLogo} alt="" aria-hidden="true" className="h-5 w-5 rounded sm:h-6 sm:w-6" />
    </a>
  </div>
);
