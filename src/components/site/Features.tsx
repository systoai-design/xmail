import {
  KeyRound,
  ShieldCheck,
  Fingerprint,
  Sparkles,
  EyeOff,
  Inbox,
  Link2,
  Cpu,
} from "lucide-react";
import { SectionField } from "./SectionField";
import { cn } from "@/lib/utils";

/**
 * Feature cards, built on Systo's card construction: a distinct visual zone
 * above a solid caption block, a hard zero-blur offset shadow rather than a
 * soft one, and a slight scatter rotation so the grid reads as objects on a
 * surface instead of cells in a table.
 *
 * Systo's own palette (warm cream, `#ff532e`) and photographic media do not
 * carry over -- this page is achromatic and has no photography -- so the visual
 * zone earns its place by showing the actual spec instead of stock imagery.
 */

type Domain = "chain" | "device";

const FEATURES: {
  icon: typeof KeyRound;
  title: string;
  body: string;
  spec: string;
  domain: Domain;
}[] = [
  {
    icon: KeyRound,
    title: "Nobody can swap your key",
    body: "Public keys live in a contract where only the address owner can write its own entry. Most encrypted apps store keys in a database an administrator could edit; here there is no such transaction to make.",
    spec: "KeyRegistry.sol",
    domain: "chain",
  },
  {
    icon: ShieldCheck,
    title: "Provable integrity",
    body: "Every message carries a keccak256 commitment on-chain. Recompute it and you know the message you are reading is byte-identical to the one that was sent.",
    spec: "keccak256 anchor",
    domain: "chain",
  },
  {
    icon: Fingerprint,
    title: "No account to breach",
    body: "Your wallet is your identity. No email, no password, no recovery questions, and no user table for anyone to steal.",
    spec: "wallet as identity",
    domain: "chain",
  },
  {
    icon: EyeOff,
    title: "Encrypted before it leaves",
    body: "Content is sealed in your browser with AES-256-GCM, attachments included. What reaches our servers is ciphertext we could not read if we wanted to.",
    spec: "AES-256-GCM",
    domain: "device",
  },
  {
    icon: Sparkles,
    title: "Drafts and summaries",
    body: "Ask it to draft a reply, tighten a paragraph, or summarise a long thread. It runs against plaintext already open in your browser, so it never needs an inbox.",
    spec: "on-device model",
    domain: "device",
  },
  {
    icon: Inbox,
    title: "A sorted inbox",
    body: "Priority, threading and suggested replies are worked out on your machine from mail you have already decrypted. Nothing is uploaded to build a profile of you.",
    spec: "local triage",
    domain: "device",
  },
];

/** Alternating scatter, small enough to read as craft rather than as a gimmick. */
const TILT = ["-0.7deg", "0.5deg", "-0.4deg", "0.6deg", "-0.55deg", "0.45deg"];

export function Features() {
  return (
    <section
      id="security"
      className="relative overflow-hidden border-y border-white/[0.06] py-24 sm:py-32"
      aria-labelledby="features-heading"
    >
      <SectionField variant="top" />
      <div className="container mx-auto px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            id="features-heading"
            className="text-balance text-4xl sm:text-5xl"
          >
            What the chain does, and what the AI does
          </h2>
          <p className="text-l3 mx-auto mt-4 max-w-xl text-pretty text-lg">
            Two jobs, kept separate. The chain proves who a recipient is and
            that a message was not altered. The AI helps you write and triage,
            on your device, never on a server.
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body, spec, domain }, i) => (
            <article
              key={title}
              style={{ ["--tilt" as string]: TILT[i] }}
              className={cn(
                "group overflow-hidden rounded-2xl border border-white/10 bg-[hsl(240_8%_8.5%)]",
                // Hard, zero-blur offset shadow: the sticker language, not a soft drop.
                "shadow-[-5px_5px_0_0_hsl(0_0%_100%/0.05)]",
                // The shadow used to grow on hover. That is the same "moves
                // under the cursor" effect by another name, so only the border
                // responds now.
                "[transform:rotate(var(--tilt))] transition-colors duration-200",
                "hover:border-white/20",
              )}
            >
              {/* --- visual zone ------------------------------------------- */}
              <div className="relative flex h-32 items-center justify-center overflow-hidden border-b border-white/10 bg-[radial-gradient(ellipse_70%_90%_at_50%_120%,hsl(0_0%_100%/0.10),transparent_70%)]">
                {/* a faint measure grid, so the zone reads as an instrument panel */}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 opacity-[0.06]"
                  style={{
                    backgroundImage:
                      "linear-gradient(hsl(0 0% 100%) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 100%) 1px, transparent 1px)",
                    backgroundSize: "22px 22px",
                  }}
                />
                <Icon
                  className="relative h-8 w-8 text-white/85 transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)] group-"
                  strokeWidth={1.25}
                />
                <span
                  className={cn(
                    "pill absolute left-3 top-3 inline-flex items-center gap-1 px-2 py-0.5 text-[10px]",
                    domain === "chain"
                      ? "bg-[hsl(var(--verified)/0.14)] text-[hsl(var(--verified))]"
                      : "bg-white/[0.07] text-white/55",
                  )}
                >
                  {domain === "chain" ? (
                    <>
                      <Link2 className="h-2.5 w-2.5" /> on-chain
                    </>
                  ) : (
                    <>
                      <Cpu className="h-2.5 w-2.5" /> on-device
                    </>
                  )}
                </span>
                <span className="absolute bottom-3 right-3 font-mono text-[10px] text-white/35">
                  {spec}
                </span>
              </div>

              {/* --- caption block ----------------------------------------- */}
              <div className="p-5">
                <h3 className="text-l1 text-base">{title}</h3>
                <p className="text-l4 mt-2 text-sm leading-relaxed">{body}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
