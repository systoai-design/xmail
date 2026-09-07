import { useEffect, useState } from "react";
import { Check, Coins, Paperclip, FileText, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SectionField } from "./SectionField";

/**
 * Credit-based pricing.
 *
 * A credit is the unit of *work*, not of time: encrypting a message, wrapping
 * its key to the recipient, and anchoring its commitment on-chain. Seats and
 * monthly limits would be the wrong shape here, because the cost driver is
 * message volume and payload size, not how many people are logged in.
 */ const CREDIT_RULES = [
  {
    icon: FileText,
    label: "Message body",
    detail: "Up to 10,000 characters",
    cost: "1 credit",
  },
  {
    icon: FileText,
    label: "Long-form",
    detail: "Each additional 10,000 characters",
    cost: "+1 credit",
  },
  {
    icon: Paperclip,
    label: "Attachments",
    detail: "Each 5 MB, encrypted with the same scheme",
    cost: "+1 credit",
  },
  {
    icon: Link2,
    label: "On-chain anchor",
    detail: "Integrity commitment written to Robinhood Chain",
    cost: "Included",
  },
];
const TIERS = [
  {
    name: "Starter",
    price: "Free",
    cadence: "",
    credits: "25 credits",
    refill: "Resets monthly",
    blurb: "Enough to try encrypted mail properly, not just once.",
    features: [
      "25 credits every month",
      "AI drafting and summaries",
      "On-chain integrity anchor",
      "Attachments up to 25 MB",
    ],
    cta: "Connect wallet",
    featured: false,
  },
  {
    name: "Pro",
    price: "$19",
    cadence: "/month",
    credits: "500 credits",
    refill: "Unused credits roll over",
    blurb: "For people whose inbox carries things that matter.",
    features: [
      "500 credits every month",
      "Credits roll over, up to 1,500",
      "Priority AI models for drafting",
      "Attachments up to 250 MB",
      "Scheduled and recurring sends",
      "Contact book with key-rotation alerts",
    ],
    cta: "Get started",
    featured: true,
  },
  {
    name: "Scale",
    price: "$0.02",
    cadence: "/credit",
    credits: "Pay as you go",
    refill: "No monthly commitment",
    blurb: "Buy a block of credits and spend them whenever.",
    features: [
      "Volume pricing from 10,000 credits",
      "Everything in Pro",
      "Shared team credit pool",
      "API access for programmatic sends",
      "Attachments up to 2 GB",
    ],
    cta: "Talk to us",
    featured: false,
  },
];

/**
 * The fan, transcribed from the landonorris socials deck.
 *
 * Rotation is a clean 7deg/step, but scale and y are NOT on any formula -- the
 * library entry says to transcribe them, so these are the measured values for
 * the three middle steps of that seven-card ladder.
 */
const FAN = [
  { rot: -7, scale: 0.9346, y: 1.3, z: 3 },
  { rot: 0, scale: 1, y: 0, z: 10 },
  { rot: 7, scale: 0.9346, y: 1.3, z: 3 },
] as const;

/** Measured hover: the card straightens and lifts, neighbours shove outward. */
const HOVER_LIFT_REM = 0.9;
const HOVER_SCALE = 1.025;
const SHOVE_REM = 0.5;

function fanTransform(i: number, hovered: number | null) {
  const base = FAN[i];
  if (hovered === i) {
    // Keeps its own place in the fan rather than snapping to centre; it only
    // straightens, lifts and grows.
    return `rotate(0deg) translateY(-${HOVER_LIFT_REM}rem) scale(${HOVER_SCALE})`;
  }
  if (hovered !== null) {
    // Push away from the hovered card, proportional to distance.
    const dir = Math.sign(i - hovered);
    const shove = dir * SHOVE_REM * Math.abs(i - hovered);
    return `rotate(${base.rot}deg) translate(${shove}rem, ${base.y}rem) scale(${base.scale})`;
  }
  return `rotate(${base.rot}deg) translateY(${base.y}rem) scale(${base.scale})`;
}

/** The fan only applies while the tiers are side by side. */
function useIsWide(query = "(min-width: 1024px)") {
  const [wide, setWide] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setWide(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);
  return wide;
}

export function Pricing({ onConnect }: { onConnect?: () => void }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const isWide = useIsWide();

  return (
    <section
      id="pricing"
      className="relative overflow-hidden py-24 sm:py-32"
      aria-labelledby="pricing-heading"
    >
      <SectionField variant="center" />
      <div className="container mx-auto px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="panel pill inline-flex items-center gap-2 px-3.5 py-1.5 text-xs">
            <Coins className="h-3.5 w-3.5 text-primary" />
            Pricing
          </span>
          <h2
            id="pricing-heading"
            className="mt-6 text-balance text-4xl sm:text-5xl"
          >
            Pay for what you send
          </h2>
          <p className="text-l3 mx-auto mt-4 max-w-xl text-pretty text-lg">
            No seats, no per-user tax. Credits are spent when a message is
            encrypted, wrapped to its recipient, and anchored on-chain &mdash;
            so an empty month costs nothing.
          </p>
        </div>

        {/* --- what a credit buys ------------------------------------------ */}
        <div className="panel mx-auto mt-12 max-w-3xl overflow-hidden p-1.5">
          <div className="grid gap-px sm:grid-cols-2">
            {CREDIT_RULES.map(({ icon: Icon, label, detail, cost }) => (
              <div
                key={label}
                className="flex items-start gap-3 rounded-2xl p-5"
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-l1 text-sm">{label}</span>
                    <span
                      className={cn(
                        "shrink-0 font-mono text-xs",
                        cost === "Included"
                          ? "text-[hsl(var(--verified))]"
                          : "text-primary",
                      )}
                    >
                      {cost}
                    </span>
                  </div>
                  <p className="text-l4 mt-0.5 text-xs leading-relaxed">
                    {detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* --- tiers, as a fanned deck --------------------------------------
            Geometry from the landonorris socials deck: a clean 7deg/step
            rotation with a measured (non-formulaic) scale falloff, and
            transform-origin center center -- the entry flags explicitly that it
            is NOT top-biased. The measured x-overlap of 11rem is deliberately
            not carried over: overlapping a decorative social wall is fine,
            overlapping pricing tiers makes them unreadable and uncomparable.
            Hovering straightens a card and shoves its neighbours outward rather
            than snapping the deck to centre. */}
        <div
          className="mx-auto mt-10 grid max-w-5xl items-start gap-4 lg:grid-cols-3"
          onMouseLeave={() => setHovered(null)}
        >
          {TIERS.map((tier, i) => (
            <div
              key={tier.name}
              onMouseEnter={() => setHovered(i)}
              style={{
                transformOrigin: "center center",
                transform: isWide ? fanTransform(i, hovered) : undefined,
                zIndex: isWide ? (hovered === i ? 20 : FAN[i].z) : undefined,
                transition:
                  "transform 500ms cubic-bezier(0.34, 1.4, 0.64, 1), border-color 300ms ease",
              }}
              className={cn(
                "panel relative flex h-full flex-col p-7 will-change-transform",
                tier.featured &&
                  "border-primary/40 shadow-[var(--shadow-accent)]",
              )}
            >
              {tier.featured && (
                <span className="pill absolute -top-3 left-7 bg-primary px-3 py-1 text-[11px] text-primary-foreground">
                  Most popular
                </span>
              )}

              <h3 className="text-l1 text-lg">{tier.name}</h3>
              <p className="text-l4 mt-1 text-sm">{tier.blurb}</p>

              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-l1 text-4xl">{tier.price}</span>
                {tier.cadence && (
                  <span className="text-l4 text-sm">{tier.cadence}</span>
                )}
              </div>

              <div className="mt-3 flex items-center gap-2 text-sm">
                <Coins className="h-3.5 w-3.5 text-primary" />
                <span className="text-l2">{tier.credits}</span>
                <span className="text-l5 text-xs">· {tier.refill}</span>
              </div>

              <ul className="mt-6 flex-1 space-y-2.5">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[hsl(var(--verified))]" />
                    <span className="text-l3">{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={onConnect}
                variant={tier.featured ? "default" : "secondary"}
                className={cn(
                  "pill mt-7 h-11 w-full",
                  tier.featured && "shadow-[var(--shadow-accent)]",
                )}
              >
                {tier.cta}
              </Button>
            </div>
          ))}
        </div>

        <p className="text-l5 mx-auto mt-6 max-w-xl text-center text-xs">
          Gas for the on-chain anchor is included in the credit. At current
          Robinhood Chain rates that is a fraction of a cent per message.
        </p>
      </div>
    </section>
  );
}
