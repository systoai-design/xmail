import { Button } from "@/components/ui/button";
import { ACTIVE_CHAIN } from "@/config/chain";
import { GlowButton } from "./GlowButton";
export function CallToAction({ onConnect }: { onConnect?: () => void }) {
  return (
    <section className="relative overflow-hidden py-24 sm:py-32">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_100%,hsl(var(--primary)/0.12),transparent)]"
      />
      <div className="container relative mx-auto px-6">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-balance text-4xl sm:text-5xl">
            Send something you&rsquo;d rather not send over email
          </h2>
          <p className="mx-auto mt-4 text-pretty text-lg text-muted-foreground">
            Connect a wallet and write a message. There is nothing to sign up
            for and nothing to uninstall if you decide against it.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <GlowButton onClick={onConnect} className="!px-7">
              Connect wallet
            </GlowButton>
            <Button
              variant="outline"
              size="lg"
              className="h-12 px-6 text-base"
              asChild
            >
              <a href="#verify">Verify a message first</a>
            </Button>
          </div>
          <p className="mt-5 text-xs text-muted-foreground">
            Currently running on {ACTIVE_CHAIN.name}
            {ACTIVE_CHAIN.testnet
              ? " — test funds only, nothing of value at risk"
              : ""}
          </p>
        </div>
      </div>
    </section>
  );
}
