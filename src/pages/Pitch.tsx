import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ChevronDown } from "lucide-react";
import { Wordmark } from "@/components/site/Wordmark";
import { SectionField } from "@/components/site/SectionField";
import { readTotalAnchored } from "@/lib/chainClient";
import { openConnect } from "@/lib/events";
import { useWallet } from "@/hooks/useWallet";
import { ACTIVE_CHAIN, isDeployed } from "@/config/chain";

/**
 * The public explainer deck.
 *
 * A deck rather than a long page because the whole argument is seven beats and
 * each one deserves a screen. Slides are real scroll-snap sections, not a
 * JavaScript carousel: scrolling, arrow keys, Page Up/Down, Home/End and the
 * browser's own find-in-page all work, and someone who prefers to scroll
 * through it like a page still can.
 *
 * The one number in here that could go stale is read live from the chain. A
 * deck about verifiability should not be quoting a figure typed into markup.
 */

const SLIDE_COUNT = 8;

export default function Pitch() {
  const { connected } = useWallet();
  const navigate = useNavigate();
  const scroller = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [anchored, setAnchored] = useState<bigint | null>(null);

  const openWallet = () => (connected ? navigate("/inbox") : openConnect());

  useEffect(() => {
    if (!isDeployed) return;
    let cancelled = false;
    readTotalAnchored()
      .then((n) => !cancelled && setAnchored(n))
      // An em-dash beats a number we cannot stand behind.
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Jump to a slide.
   *
   * Assigns scrollTop rather than animating. Slides cut; they do not scroll
   * past one another, and a deck that scrolls its way from slide one to slide
   * six shows the viewer five slides they did not ask for. Wheel and trackpad
   * scrolling still glide, because that is the snap container's own job.
   *
   * It is also the reliable option: smooth programmatic scrolls on this
   * container did not land consistently under test, where an instant
   * assignment always did.
   */
  const goTo = useCallback((i: number) => {
    const el = scroller.current;
    if (!el) return;
    const target = Math.max(0, Math.min(SLIDE_COUNT - 1, i));
    el.scrollTop = target * el.clientHeight;
  }, []);

  /**
   * Move by one slide, relative to where the deck ACTUALLY is.
   *
   * Not `goTo(index + 1)`. `index` comes from a scroll event, which arrives a
   * frame or more after the scroll itself -- so two quick presses both read the
   * same stale value and the second one asks for a slide the deck is already
   * on. Pressing down twice advanced one slide. Reading scrollTop at the moment
   * of the keypress cannot go stale.
   */
  const step = useCallback(
    (delta: number) => {
      const el = scroller.current;
      if (!el) return;
      goTo(Math.round(el.scrollTop / el.clientHeight) + delta);
    },
    [goTo],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowDown", "ArrowRight", "PageDown", " "].includes(e.key)) {
        e.preventDefault();
        step(1);
      } else if (["ArrowUp", "ArrowLeft", "PageUp"].includes(e.key)) {
        e.preventDefault();
        step(-1);
      } else if (e.key === "Home") {
        e.preventDefault();
        goTo(0);
      } else if (e.key === "End") {
        e.preventDefault();
        goTo(SLIDE_COUNT - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, goTo]);

  // Which slide is showing comes from the scroll position, not from whatever
  // the last click asked for -- otherwise the rail lies the moment someone
  // scrolls with a trackpad.
  //
  // Arithmetic rather than an IntersectionObserver. Every slide is exactly one
  // container tall, so the index IS scrollTop / clientHeight; an observer adds
  // thresholds, a root, and eight subscriptions to compute a division. It also
  // gets throttled when the page is not visible, which made this read as broken
  // whenever the tab was in the background.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const onScroll = () => {
      const i = Math.round(el.scrollTop / el.clientHeight);
      setIndex(Math.max(0, Math.min(SLIDE_COUNT - 1, i)));
    };
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div className="relative h-[100dvh] overflow-hidden bg-background">
      {/* Chrome sits above the scroller so it does not scroll with the slides. */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-6 py-6">
        <Link to="/" className="pointer-events-auto">
          <Wordmark />
        </Link>
        <Link
          to="/docs"
          className="text-l4 panel pill pointer-events-auto px-4 py-2 text-sm transition-colors hover:bg-white/[0.06] hover:text-foreground"
        >
          Documentation
        </Link>
      </header>

      <nav
        aria-label="Slides"
        className="absolute right-6 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-2.5 md:flex"
      >
        {Array.from({ length: SLIDE_COUNT }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`Go to slide ${i + 1}`}
            aria-current={i === index}
            className={
              i === index
                ? "h-6 w-1 rounded-full bg-foreground transition-all duration-300"
                : "h-1.5 w-1 rounded-full bg-white/25 transition-all duration-300 hover:bg-white/50"
            }
          />
        ))}
      </nav>

      <p className="text-l5 absolute bottom-6 left-6 z-20 font-mono text-xs">
        {String(index + 1).padStart(2, "0")} / {String(SLIDE_COUNT).padStart(2, "0")}
      </p>

      {index < SLIDE_COUNT - 1 && (
        <button
          type="button"
          onClick={() => step(1)}
          aria-label="Next slide"
          className="text-l5 absolute bottom-5 left-1/2 z-20 -translate-x-1/2 rounded-full p-2 transition-colors hover:text-foreground"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      )}

      <div
        ref={scroller}
        // Deliberately no `scroll-smooth`. index.css already sets
        // scroll-behavior: smooth globally, and inheriting it here fights the
        // instant jumps in goTo -- the deck is meant to cut between slides.
        className="h-full snap-y snap-mandatory overflow-y-auto [scroll-behavior:auto]"
      >
        <Slide n={0} field="center">
          <span className="panel pill text-l4 inline-flex items-center gap-2 px-3 py-1 text-xs">
            {isDeployed ? `Live on ${ACTIVE_CHAIN.shortName}` : "In development"}
          </span>
          <h1 className="mt-7 text-balance text-5xl leading-[1.05] sm:text-7xl">
            Email, addressed
            <br />
            to a wallet
          </h1>
          <p className="text-l3 mx-auto mt-6 max-w-xl text-pretty text-lg leading-relaxed">
            Encrypted in your browser. Proven on a public chain. No account, no
            password, nothing for us to read.
          </p>
        </Slide>

        <Slide n={1} field="left">
          <Eyebrow>The problem</Eyebrow>
          <H>Email was never private</H>
          <p className="text-l3 mt-6 max-w-2xl text-pretty text-lg leading-relaxed">
            Every mainstream mail provider can read your mail. Not because they
            are careless, but because the architecture requires it &mdash; the
            message sits on their servers in a form they can open. Encryption
            gets bolted on afterwards, and you are asked to trust a promise not
            to look.
          </p>
          <p className="text-l3 mt-4 max-w-2xl text-pretty text-lg leading-relaxed">
            The encrypted alternatives ask for the same trust in a smaller
            company. You still cannot check whether the key you were handed is
            really your recipient's, or whether the message you are reading is
            the one that was sent.
          </p>
        </Slide>

        <Slide n={2} field="right">
          <Eyebrow>What we built</Eyebrow>
          <H>Your wallet is the address</H>
          <p className="text-l3 mt-6 max-w-2xl text-pretty text-lg leading-relaxed">
            No signup, no password, no email address anywhere in the system.
            Connect a wallet and it is your identity.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <Card
              t="Sealed in your browser"
              d="AES-256-GCM for the message, RSA-OAEP-2048 to wrap the key. The plaintext never leaves your device."
            />
            <Card
              t="Keys live on-chain"
              d="Only an address owner can write its own key. There is no admin function to substitute one."
            />
            <Card
              t="Proof, not promises"
              d="Every message carries a fingerprint on a public chain. Anyone can check it. Including you."
            />
          </div>
        </Slide>

        <Slide n={3} field="top">
          <Eyebrow>How the proof works</Eyebrow>
          <H>A fingerprint, never the message</H>
          <p className="text-l3 mt-6 max-w-2xl text-pretty text-lg leading-relaxed">
            When you send, your browser computes a keccak256 commitment over the
            ciphertext and both addresses, and you sign it onto the chain{" "}
            <em className="not-italic text-foreground">before</em> the message
            is stored. Decline the signature and nothing is sent.
          </p>
          <div className="panel mt-8 max-w-2xl overflow-x-auto p-5">
            <code className="whitespace-pre font-mono text-xs leading-relaxed text-foreground">
              {`keccak256(ciphertext + sender + recipient)`}
            </code>
          </div>
          <p className="text-l4 mt-6 max-w-2xl text-pretty leading-relaxed">
            That single line is the whole guarantee. Change one character of the
            message and the fingerprint stops matching. It reveals nothing about
            what was written &mdash; only that this exact message existed,
            between these two addresses, at that block.
          </p>
        </Slide>

        <Slide n={4} field="bottom">
          <Eyebrow>Status</Eyebrow>
          <H>Running, today</H>
          <div className="mt-10 grid max-w-3xl gap-6 sm:grid-cols-3">
            <Stat
              v={anchored === null ? "—" : anchored.toString()}
              l="Messages anchored end-to-end"
            />
            <Stat v="3" l="Contracts live and verifiable" />
            {/* A word set at the same size as a two-digit number wraps and
                breaks the row's baseline, so text-shaped values get their own
                size rather than the numeral size. */}
            <Stat v={ACTIVE_CHAIN.shortName} l="Network" small />
          </div>
          <p className="text-l4 mt-10 max-w-2xl text-pretty leading-relaxed">
            {ACTIVE_CHAIN.testnet ? (
              <>
                xmail is in open beta on {ACTIVE_CHAIN.name}. Sending,
                encryption, key registry, on-chain proofs, credits and parked
                mail all work end to end &mdash; on a test network, so nothing
                of value is at risk and nothing is charged.
              </>
            ) : (
              <>
                xmail is live on {ACTIVE_CHAIN.name}. Sending, encryption, key
                registry, on-chain proofs, credits and parked mail all work end
                to end.
              </>
            )}
          </p>
        </Slide>

        <Slide n={5} field="left">
          <Eyebrow>What it costs</Eyebrow>
          <H>Pay for what you send</H>
          <p className="text-l3 mt-6 max-w-2xl text-pretty text-lg leading-relaxed">
            One credit is one message, up to 10,000 characters, with the
            on-chain proof and its gas included. No seats, no per-user tax, and
            an empty month costs nothing.
          </p>
          <div className="mt-10 grid max-w-3xl gap-4 sm:grid-cols-3">
            <Price tier="Starter" price="Free" note="25 credits every month" />
            <Price tier="Pro" price="$19" note="500 credits a month" />
            <Price tier="Scale" price="$0.02" note="Per credit, pay as you go" />
          </div>
          {ACTIVE_CHAIN.testnet && (
            <p className="text-l5 mt-6 max-w-2xl text-sm leading-relaxed">
              Free during the beta. These are the prices for when xmail moves to
              mainnet; nothing is charged on a test network.
            </p>
          )}
        </Slide>

        <Slide n={6} field="center">
          <Eyebrow>What&rsquo;s next</Eyebrow>
          <H>Where this goes</H>
          {/* Labelled as planned, in the copy and not only in a footnote. A deck
              whose argument is verifiability cannot blur what is shipped and
              what is intended. */}
          <p className="text-l4 mt-6 max-w-2xl text-pretty leading-relaxed">
            Everything below is planned, not shipped. Dates are intentions
            rather than commitments.
          </p>
          <div className="mt-8 max-w-2xl space-y-5">
            <Next
              t="Mainnet"
              d="The same contracts, deployed to Robinhood Chain proper, with credits switched on."
            />
            <Next
              t="Pay per send"
              d="A few cents folded into the proof you already sign, so a single message needs no subscription and no balance."
            />
            <Next
              t="Scheduled and recurring sends"
              d="Written, held back for the infrastructure to run it reliably."
            />
            <Next
              t="Larger attachments"
              d="Same encryption, more room."
            />
          </div>
        </Slide>

        <Slide n={7} field="bottom">
          <H>Send something you&rsquo;d rather not send over email</H>
          <p className="text-l3 mx-auto mt-6 max-w-xl text-pretty text-lg leading-relaxed">
            Connect a wallet and write a message. There is nothing to sign up
            for and nothing to uninstall if you decide against it.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={openWallet}
              className="pill inline-flex items-center gap-2 bg-foreground px-7 py-3.5 text-base text-background transition-opacity hover:opacity-90"
            >
              Connect wallet
              <ArrowRight className="h-4 w-4" />
            </button>
            <Link
              to="/docs"
              className="panel pill px-6 py-3.5 text-base transition-colors hover:bg-white/[0.06]"
            >
              Read the documentation
            </Link>
          </div>
          <p className="text-l5 mt-10 text-sm">
            <Link to="/" className="hover:text-foreground">
              xmail.today
            </Link>
          </p>
        </Slide>
      </div>
    </div>
  );
}

/* ---------- slide furniture ---------- */

function Slide({
  n,
  field,
  children,
}: {
  n: number;
  field: "top" | "bottom" | "left" | "right" | "center";
  children: React.ReactNode;
}) {
  // Slide 0 and the last one are centred; the argument slides are left-aligned
  // so long paragraphs have a consistent left edge to read down.
  const centred = n === 0 || n === SLIDE_COUNT - 1;
  return (
    <section
      data-slide={n}
      /*
       * overflow-y-auto, not overflow-hidden. The pricing slide's content is
       * taller than a 812px phone viewport, and on a shorter handset several
       * slides are -- with hidden overflow the bottom of those slides is simply
       * unreachable, which on the pricing slide means the sentence saying
       * nothing is charged yet.
       *
       * The centring is `my-auto` on the child rather than `items-center` on
       * this flex parent, because a centred flex child that overflows its
       * container cannot be scrolled back up to: the top gets cut off instead
       * of the bottom. my-auto centres only when there is room to spare.
       */
      className="relative flex h-full w-full shrink-0 snap-start overflow-y-auto overscroll-contain"
    >
      <SectionField variant={field} />
      <div
        className={`container relative mx-auto my-auto px-6 py-24 ${centred ? "text-center" : ""}`}
      >
        {/* Centred column either way; only the text alignment differs. Left-
            aligned text hard against the viewport edge reads as a layout bug
            on a wide screen, not as a deliberate choice. */}
        <div className={centred ? "mx-auto max-w-3xl" : "mx-auto max-w-4xl"}>
          {children}
        </div>
      </div>
    </section>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-l5 block text-xs uppercase tracking-[0.18em]">
      {children}
    </span>
  );
}

function H({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-4 text-balance text-4xl leading-[1.08] sm:text-6xl">
      {children}
    </h2>
  );
}

function Card({ t, d }: { t: string; d: string }) {
  return (
    <div className="panel p-5">
      <p className="text-base">{t}</p>
      <p className="text-l4 mt-2 text-pretty text-sm leading-relaxed">{d}</p>
    </div>
  );
}

function Stat({ v, l, small }: { v: string; l: string; small?: boolean }) {
  return (
    <div>
      <p className={small ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl"}>
        {v}
      </p>
      <p className="text-l4 mt-2 text-pretty text-sm leading-relaxed">{l}</p>
    </div>
  );
}

function Price({
  tier,
  price,
  note,
}: {
  tier: string;
  price: string;
  note: string;
}) {
  return (
    <div className="panel p-5">
      <p className="text-l4 text-xs uppercase tracking-wider">{tier}</p>
      <p className="mt-2 text-3xl">{price}</p>
      <p className="text-l4 mt-1 text-pretty text-sm leading-relaxed">{note}</p>
    </div>
  );
}

function Next({ t, d }: { t: string; d: string }) {
  return (
    <div className="flex gap-4">
      <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-white/30" />
      <div>
        <p className="text-base">{t}</p>
        <p className="text-l4 mt-1 text-pretty text-sm leading-relaxed">{d}</p>
      </div>
    </div>
  );
}
