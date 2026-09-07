import { ArrowUpRight } from "lucide-react";
import ponsLogo from "@/assets/pons-logo.png";
import { SectionField } from "./SectionField";

/**
 * Where xmail lives, and who to back.
 *
 * The Pons mark is used here because this link genuinely goes to Pons -- a
 * neutral icon would have been the honest choice for a link wearing someone
 * else's branding, but the reverse is also true: showing their real mark on a
 * link that reaches them is what a reader expects.
 */
export function SupportSection() {
  return (
    <section
      className="relative py-20 sm:py-24"
      aria-labelledby="support-heading"
    >
      <SectionField variant="center" bleed />

      <div className="container relative mx-auto px-6">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <h2 id="support-heading" className="text-balance text-3xl sm:text-4xl">
            Support us at Robinhood Chain
          </h2>
          <p className="text-l3 mt-4 max-w-xl text-pretty text-base leading-relaxed">
            xmail is built on Robinhood Chain and launching through Pons. Follow
            the launch there.
          </p>

          <a
            href="https://www.ponsfamily.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="panel mt-8 inline-flex items-center gap-4 rounded-2xl px-6 py-4 transition-colors hover:bg-white/[0.06]"
          >
            <img
              src={ponsLogo}
              alt=""
              aria-hidden="true"
              className="h-10 w-10 shrink-0 rounded-xl"
            />
            <span className="text-left">
              <span className="block text-base">Pons</span>
              <span className="text-l4 block text-xs">ponsfamily.com</span>
            </span>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </a>
        </div>
      </div>
    </section>
  );
}
