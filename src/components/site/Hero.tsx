import { ArrowRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ACTIVE_CHAIN, isDeployed } from "@/config/chain";
import { AuroraSweep } from "./AuroraSweep";
import { InboxPreview } from "./InboxPreview";
import { GlowButton } from "./GlowButton";
export function Hero({ onConnect }: { onConnect?: () => void }) {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
      {/* The light field. This is the page's character -- without a real light source the layout reads as a flat card grid. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[820px] overflow-hidden [-webkit-mask-image:linear-gradient(to_bottom,#000_0%,#000_66%,transparent_100%)] [mask-image:linear-gradient(to_bottom,#000_0%,#000_66%,transparent_100%)]"
      >
        <AuroraSweep accent={[45, 0.05, 0.86]} />
        {/* Legibility scrim. The arc is bright enough to swallow body copy, and contrast can't depend on which frame of an animation is on screen, so the copy column gets a guaranteed floor of its own. */}
        <div className="absolute inset-x-0 top-0 h-[720px] bg-[radial-gradient(ellipse_50%_62%_at_50%_40%,hsl(var(--background)/0.94),hsl(var(--background)/0.7)_58%,transparent_82%)]" />
        {/* The field used to be faded out by painting the page ground over it in
            a gradient. Two near-blacks composited over each other never quite
            resolve: a few percent of the arc survived to the very last pixel of
            the box and then vanished at once, which is a hard edge in the middle
            of the hero. A mask ramps ALPHA instead of stacking colour, so the
            field is provably zero where the box ends. */}
      </div>

      <div className="container relative mx-auto px-6">
        <div className="mx-auto max-w-3xl text-center">
          <a
            href="#layers"
            className="fade-in panel pill inline-flex items-center gap-2 px-3.5 py-1.5 text-xs transition-colors hover:border-primary/30"
          >
            {isDeployed ? (
              <>
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-[hsl(var(--verified))] opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[hsl(var(--verified))]" />
                </span>
                Live on {ACTIVE_CHAIN.shortName}
              </>
            ) : (
              <>
                <Lock className="h-3.5 w-3.5 text-primary" />
                Blockchain email, AI assisted
              </>
            )}
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
          </a>

          {/* Measured from the reference: 76px/700, line-height 1.0, tracking -0.04em. The tight leading is what makes a two-line display read as one mark rather than two rows of text. */}
          <h1 className="fade-in-up mt-7 text-balance text-5xl sm:text-6xl lg:text-[76px]">
            Email, addressed
            <br />
            to a wallet
          </h1>

          <p className="text-l3 fade-in-up mx-auto mt-6 max-w-xl text-pretty text-lg leading-relaxed sm:text-xl">
            Encrypted in your browser and sent wallet-to-wallet on{" "}
            {ACTIVE_CHAIN.shortName}. The chain holds the recipient&rsquo;s key
            so nobody can impersonate them, and a proof of what you sent so
            nobody can alter it.
          </p>

          <p className="text-l4 mt-6 text-xs">
            25 free credits · no signup · running on {ACTIVE_CHAIN.shortName}
          </p>

          <div className="fade-in-up mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <GlowButton onClick={onConnect} className="!px-7">
              Connect wallet
            </GlowButton>
            <Button
              variant="ghost"
              size="lg"
              className="h-12 px-6 text-base"
              asChild
            >
              <a href="#layers">See how it works</a>
            </Button>
          </div>
        </div>

        {/* --- the product, not an abstraction ------------------------------ */}
        <div className="fade-in-up relative mx-auto mt-20 max-w-4xl [animation-delay:120ms]">
          <div
            aria-hidden="true"
            className="absolute -inset-x-8 -top-6 bottom-0 rounded-[2rem] bg-[radial-gradient(ellipse_at_50%_0%,hsl(var(--primary)/0.10),transparent_70%)] blur-2xl"
          />
          <InboxPreview />
        </div>
      </div>
    </section>
  );
}
