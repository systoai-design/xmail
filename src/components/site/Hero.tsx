import { ArrowRight, Lock, Link2, Paperclip, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ACTIVE_CHAIN, isDeployed } from "@/config/chain";
import { AuroraSweep } from "./AuroraSweep";
import { cn } from "@/lib/utils";
import { GlowButton } from "./GlowButton";
const INBOX_PREVIEW = [
  {
    from: "Dana Okafor",
    handle: "0x7f3a…c19d",
    subject: "Series A term sheet — final",
    preview: "Redlines attached. Everything below clause 7 is agreed.",
    time: "09:41",
    unread: true,
    attachment: true,
    verified: true,
  },
  {
    from: "Marcus Webb",
    handle: "0x2b8e…4a70",
    subject: "Re: audit scope",
    preview: "Confirmed for the 14th. Sending the engagement letter.",
    time: "08:12",
    unread: true,
    attachment: false,
    verified: true,
  },
  {
    from: "Priya Raman",
    handle: "0x9d41…8fe2",
    subject: "Board deck v4",
    preview: "Updated the cohort chart on slide 12 as discussed.",
    time: "Yesterday",
    unread: false,
    attachment: true,
    verified: true,
  },
  {
    from: "Tom Alvarez",
    handle: "0x4c67…21ab",
    subject: "Payroll keys rotated",
    preview: "New key is registered. Old one expires Friday.",
    time: "Yesterday",
    unread: false,
    attachment: false,
    verified: true,
  },
];
export function Hero({ onConnect }: { onConnect?: () => void }) {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
      {/* The light field. This is the page's character -- without a real light source the layout reads as a flat card grid. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[820px] overflow-hidden"
      >
        <AuroraSweep accent={[45, 0.05, 0.86]} />
        {/* Legibility scrim. The arc is bright enough to swallow body copy, and contrast can't depend on which frame of an animation is on screen, so the copy column gets a guaranteed floor of its own. */}
        <div className="absolute inset-x-0 top-0 h-[720px] bg-[radial-gradient(ellipse_50%_62%_at_50%_40%,hsl(var(--background)/0.94),hsl(var(--background)/0.7)_58%,transparent_82%)]" />
        {/* Fade the field into the page ground so the sections below inherit it rather than butting against a hard edge. */}
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-b from-transparent to-[hsl(var(--background))]" />
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
function InboxPreview() {
  return (
    <div className="panel relative overflow-hidden shadow-[var(--shadow-xl)]">
      {/* window chrome */}
      <div className="flex items-center gap-2 border-b border-border bg-[hsl(var(--surface-sunken))] px-4 py-3">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
        </div>
        <div className="mx-auto flex items-center gap-1.5 rounded-md bg-card px-2.5 py-1 text-[11px] text-muted-foreground">
          <Lock className="h-2.5 w-2.5" /> xmail — Inbox
        </div>
      </div>

      <div className="divide-y divide-border">
        {INBOX_PREVIEW.map((mail) => (
          <div
            key={mail.subject}
            className={cn(
              "flex items-start gap-3 px-4 py-3.5 text-left transition-colors sm:px-5",
              mail.unread && "bg-primary/[0.03]",
            )}
          >
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground">
              {mail.from.charAt(0)}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span
                  className={cn(
                    "truncate text-sm",
                    mail.unread ? "font-semibold" : " text-foreground/80",
                  )}
                >
                  {mail.from}
                </span>
                <span className="hidden shrink-0 font-mono text-[11px] text-muted-foreground sm:inline">
                  {mail.handle}
                </span>
                <span className="ml-auto shrink-0 text-[11px] tabular-nums text-muted-foreground">
                  {mail.time}
                </span>
              </div>
              <p
                className={cn(
                  "mt-0.5 truncate text-sm",
                  mail.unread ? "font-medium" : "text-foreground/70",
                )}
              >
                {mail.subject}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {mail.preview}
              </p>
            </div>

            <div className="mt-0.5 flex shrink-0 items-center gap-1.5">
              {mail.attachment && (
                <Paperclip className="h-3.5 w-3.5 text-muted-foreground/60" />
              )}
              {mail.verified && isDeployed && (
                <span
                  title="Integrity anchor verified on-chain"
                  className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--verified)/0.12)] px-1.5 py-0.5 text-[10px] text-[hsl(var(--verified))]"
                >
                  <Link2 className="h-2.5 w-2.5" /> verified
                </span>
              )}
              {mail.unread && (
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-border bg-[hsl(var(--surface-sunken))] px-5 py-2.5 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Lock className="h-3 w-3" />
          AES-256-GCM · decrypted locally
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Star className="h-3 w-3" />
          {INBOX_PREVIEW.filter((m) => m.unread).length} unread
        </span>
      </div>
    </div>
  );
}
