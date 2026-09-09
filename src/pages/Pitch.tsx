import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ChevronDown } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Wordmark } from "@/components/site/Wordmark";
import { SectionField } from "@/components/site/SectionField";
import { InboxPreview } from "@/components/site/InboxPreview";
import { readTotalAnchored } from "@/lib/chainClient";
import { openConnect } from "@/lib/events";
import { useWallet } from "@/hooks/useWallet";
import { ACTIVE_CHAIN, isDeployed } from "@/config/chain";

gsap.registerPlugin(ScrollTrigger);

/**
 * The public explainer deck.
 *
 * A deck rather than a long page because the whole argument is eight beats and
 * each one deserves a screen. Slides are real scroll-snap sections, not a
 * JavaScript carousel: scrolling, arrow keys, Page Up/Down, Home/End and the
 * browser's own find-in-page all work.
 *
 * Motion is one timeline per slide rather than a single page-length one. Each
 * plays as its slide arrives and reverses as it leaves, so scrolling back up
 * re-runs it instead of showing a slide that has already spent itself.
 *
 * Every hidden-at-rest state is set BY GSAP, never in the markup or the
 * stylesheet. If this code never runs -- reduced motion, a script error, a
 * stale trigger -- the deck degrades to a plain readable page rather than to
 * eight blank screens. `gsap.from` leaving elements stuck at opacity 0 has
 * already shipped on this site once.
 *
 * The one number that could go stale is read live from the chain. A deck about
 * verifiability should not quote a figure typed into markup.
 */

const SLIDE_COUNT = 8;

export default function Pitch() {
  const { connected } = useWallet();
  const navigate = useNavigate();
  const root = useRef<HTMLDivElement>(null);
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
   * six shows the viewer five slides they did not ask for.
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
   * Not `goTo(index + 1)`. `index` comes from a scroll event, which lands a
   * frame late, so two quick presses both read the same stale value and the
   * second asks for a slide the deck is already on -- pressing down twice
   * advanced one slide. scrollTop at the moment of the keypress cannot go
   * stale.
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

  // Which slide is showing comes from the scroll position. Arithmetic rather
  // than an IntersectionObserver: every slide is exactly one container tall, so
  // the index IS scrollTop / clientHeight, and an observer would add thresholds
  // and eight subscriptions to compute a division.
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

  useGSAP(
    () => {
      const scrollerEl = scroller.current;
      if (!scrollerEl) return;

      const mm = gsap.matchMedia();

      // Everything lives inside the no-preference branch, and that is what
      // makes reduced motion safe rather than merely quieter: under `reduce`
      // no gsap.set runs at all, so nothing is ever hidden to begin with.
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const slides = gsap.utils.toArray<HTMLElement>("[data-slide]");

        slides.forEach((slide, i) => {
          const q = gsap.utils.selector(slide);
          const words = q(".rv-inner");
          const rises = q("[data-rise]");
          const cards = q("[data-card]");
          const counts = q<HTMLElement>("[data-count]");
          const draws = q<SVGPathElement>("[data-draw]");
          const nodes = q("[data-node]");
          const stage = q("[data-stage]");
          const pulse = q("[data-pulse]");

          // --- rest states -------------------------------------------------
          // Perspective goes on the slide, not on each element. Children of one
          // perspective share a vanishing point, so a row of cards tilts like
          // one object seen from an angle instead of three objects each in
          // their own little world.
          gsap.set(slide, { perspective: 1200 });

          if (words.length) {
            gsap.set(words, { yPercent: 118, rotateX: -78, opacity: 0 });
          }
          if (rises.length) {
            gsap.set(rises, { y: 28, autoAlpha: 0, filter: "blur(10px)" });
          }
          if (cards.length) {
            gsap.set(cards, { y: 44, z: -140, rotateX: 14, autoAlpha: 0 });
          }
          if (nodes.length) gsap.set(nodes, { scale: 0.7, autoAlpha: 0 });
          if (stage.length) {
            gsap.set(stage, {
              y: 90,
              z: -320,
              rotateX: 24,
              scale: 0.94,
              autoAlpha: 0,
            });
          }
          if (pulse.length) gsap.set(pulse, { autoAlpha: 0 });
          draws.forEach((path) => {
            const len = path.getTotalLength();
            gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
          });

          // --- the entrance ------------------------------------------------
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: slide,
              scroller: scrollerEl,
              start: "top 75%",
              end: "bottom 25%",
              toggleActions: "play none none reverse",
            },
          });

          if (words.length) {
            // Rotating up from flat is the difference between a heading that
            // ARRIVES and one that merely appears. The pivot sits behind the
            // type, so words hinge on their baseline rather than their middle.
            tl.to(words, {
              yPercent: 0,
              rotateX: 0,
              opacity: 1,
              duration: 1,
              ease: "expo.out",
              stagger: { each: 0.055, from: "start" },
            });
          }
          if (rises.length) {
            tl.to(
              rises,
              {
                y: 0,
                autoAlpha: 1,
                filter: "blur(0px)",
                duration: 0.8,
                ease: "power3.out",
                stagger: 0.08,
              },
              words.length ? "-=0.7" : 0,
            );
          }
          if (stage.length) {
            tl.to(
              stage,
              {
                y: 0,
                z: 0,
                rotateX: 0,
                scale: 1,
                autoAlpha: 1,
                duration: 1.3,
                ease: "expo.out",
              },
              "-=0.85",
            );
          }
          if (draws.length) {
            tl.to(
              draws,
              { strokeDashoffset: 0, duration: 1.2, ease: "power2.inOut" },
              "-=0.6",
            );
          }
          if (nodes.length) {
            tl.to(
              nodes,
              {
                scale: 1,
                autoAlpha: 1,
                duration: 0.55,
                ease: "back.out(2.2)",
                stagger: 0.13,
              },
              "-=1.0",
            );
          }
          if (cards.length) {
            tl.to(
              cards,
              {
                y: 0,
                z: 0,
                rotateX: 0,
                autoAlpha: 1,
                duration: 0.85,
                ease: "expo.out",
                stagger: 0.11,
              },
              "-=0.7",
            );
          }

          counts.forEach((node) => {
            const proxy = { v: 0 };
            tl.to(
              proxy,
              {
                v: 1,
                duration: 1.2,
                ease: "power2.out",
                onUpdate: () => {
                  // Read the target now, not when the tween was built: the
                  // chain figure may only have landed since. If it still has
                  // not, leave whatever React rendered alone rather than
                  // counting to a zero nobody meant.
                  const raw = node.dataset.count;
                  if (raw === undefined || raw === "") return;
                  const to = Number(raw);
                  node.textContent = Math.round(proxy.v * to).toLocaleString();
                },
              },
              "-=0.95",
            );
          });

          // --- motion that continues after the entrance --------------------
          // A dot running the length of the commitment chain, so the diagram
          // reads as a pipeline with something moving through it rather than
          // as four boxes joined by a rule.
          pulse.forEach((dot) => {
            tl.to(dot, { autoAlpha: 1, duration: 0.3 }, "-=0.2");
            gsap.fromTo(
              dot,
              { xPercent: 0 },
              {
                xPercent: 100,
                duration: 2.6,
                ease: "power1.inOut",
                repeat: -1,
                repeatDelay: 0.9,
              },
            );
          });

          // The mockup keeps breathing once it has landed. Without it the
          // slide dies the instant the entrance finishes.
          stage.forEach((el) => {
            gsap.to(el, {
              y: -14,
              duration: 4.5,
              ease: "sine.inOut",
              yoyo: true,
              repeat: -1,
              delay: 1.4,
            });
          });

          // --- scroll-linked parallax --------------------------------------
          // The genuinely scrubbed part. As a slide crosses the viewport its
          // layers travel at different rates, so the composition has depth
          // WHILE you scroll rather than only at the moment it arrived.
          q("[data-depth]").forEach((layer) => {
            const depth = Number((layer as HTMLElement).dataset.depth ?? 1);
            gsap.fromTo(
              layer,
              { yPercent: 5 * depth },
              {
                yPercent: -5 * depth,
                ease: "none",
                scrollTrigger: {
                  trigger: slide,
                  scroller: scrollerEl,
                  start: "top bottom",
                  end: "bottom top",
                  scrub: true,
                },
              },
            );
          });

          // Slide one has nothing above it to scroll in from, so its trigger
          // never fires an enter. It plays on arrival instead.
          if (i === 0) tl.play(0);
        });

        // Triggers measure against a nested scroller, which has no size until
        // layout has settled.
        requestAnimationFrame(() => ScrollTrigger.refresh());
      });

      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <div
      ref={root}
      className="relative h-[100dvh] overflow-hidden bg-background"
    >
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
        {String(index + 1).padStart(2, "0")} /{" "}
        {String(SLIDE_COUNT).padStart(2, "0")}
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
        // Deliberately no `scroll-smooth`: index.css sets scroll-behavior
        // globally, and inheriting it fights the instant jumps in goTo.
        className="h-full snap-y snap-mandatory overflow-y-auto [scroll-behavior:auto]"
      >
        <Slide n={0} field="center">
          <span
            data-rise
            className="panel pill text-l4 inline-flex items-center gap-2 px-3 py-1 text-xs"
          >
            {isDeployed ? `Live on ${ACTIVE_CHAIN.shortName}` : "In development"}
          </span>
          <h1 className="mt-7 text-5xl leading-[1.05] sm:text-7xl">
            <Reveal text="Email, addressed" block />
            <Reveal text="to a wallet" block />
          </h1>
          <p
            data-rise
            className="text-l3 mx-auto mt-6 max-w-xl text-pretty text-lg leading-relaxed"
          >
            Encrypted in your browser. Proven on a public chain. No account, no
            password, nothing for us to read.
          </p>
        </Slide>

        <Slide n={1} field="left">
          <Eyebrow>The problem</Eyebrow>
          <H>Email was never private</H>
          <p
            data-rise
            className="text-l3 mt-6 max-w-2xl text-pretty text-lg leading-relaxed"
          >
            Every mainstream mail provider can read your mail. Not because they
            are careless, but because the architecture requires it &mdash; the
            message sits on their servers in a form they can open. Encryption
            gets bolted on afterwards, and you are asked to trust a promise not
            to look.
          </p>
          <p
            data-rise
            className="text-l3 mt-4 max-w-2xl text-pretty text-lg leading-relaxed"
          >
            The encrypted alternatives ask for the same trust in a smaller
            company. You still cannot check whether the key you were handed is
            really your recipient&rsquo;s, or whether the message you are
            reading is the one that was sent.
          </p>
        </Slide>

        <Slide n={2} field="right">
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            <div data-depth="1.6">
              <Eyebrow>What we built</Eyebrow>
              <H>Your wallet is the address</H>
              <p
                data-rise
                className="text-l3 mt-5 text-pretty text-base leading-relaxed"
              >
                No signup, no password, no email address anywhere in the
                system. Connect a wallet and it is your identity.
              </p>
              <div className="mt-6 space-y-2.5">
                <Card
                  t="Sealed in your browser"
                  d="AES-256-GCM for the message, RSA-OAEP-2048 to wrap the key."
                />
                <Card
                  t="Keys live on-chain"
                  d="Only an address owner can write its own key. There is no admin function to substitute one."
                />
                <Card
                  t="Proof, not promises"
                  d="Every message carries a fingerprint anyone can check. Including you."
                />
              </div>
            </div>

            {/* The actual product, tilted into the page and settling flat. It
                is the same component the home page renders, so the two cannot
                drift into showing different inboxes. */}
            <div data-depth="0.5" className="relative">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-6 rounded-[2rem] bg-[radial-gradient(ellipse_at_50%_30%,hsl(var(--primary)/0.13),transparent_70%)] blur-2xl"
              />
              <div data-stage className="relative">
                <InboxPreview />
              </div>
            </div>
          </div>
        </Slide>

        <Slide n={3} field="top">
          <Eyebrow>How the proof works</Eyebrow>
          <H>A fingerprint, never the message</H>
          <p
            data-rise
            className="text-l3 mt-6 max-w-2xl text-pretty text-lg leading-relaxed"
          >
            When you send, your browser computes a keccak256 commitment over the
            ciphertext and both addresses, and you sign it onto the chain{" "}
            <em className="not-italic text-foreground">before</em> the message
            is stored. Decline the signature and nothing is sent.
          </p>

          <div data-depth="0.6">
            <ProofDiagram />
          </div>

          <p
            data-rise
            className="text-l4 mt-8 max-w-2xl text-pretty leading-relaxed"
          >
            Change one character of the message and the fingerprint stops
            matching. It reveals nothing about what was written &mdash; only
            that this exact message existed, between these two addresses, at
            that block.
          </p>
        </Slide>

        <Slide n={4} field="bottom">
          <Eyebrow>Status</Eyebrow>
          <H>Running, today</H>
          <div data-depth="0.6" className="mt-10 grid max-w-3xl gap-6 sm:grid-cols-3">
            <Stat
              value={anchored === null ? null : Number(anchored)}
              l="Messages anchored end-to-end"
            />
            <Stat value={3} l="Contracts live and verifiable" />
            <Stat text={ACTIVE_CHAIN.shortName} l="Network" />
          </div>
          <p
            data-rise
            className="text-l4 mt-10 max-w-2xl text-pretty leading-relaxed"
          >
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
          <p
            data-rise
            className="text-l3 mt-6 max-w-2xl text-pretty text-lg leading-relaxed"
          >
            One credit is one message, up to 10,000 characters, with the
            on-chain proof and its gas included. No seats, no per-user tax, and
            an empty month costs nothing.
          </p>
          <div data-depth="0.6" className="mt-10 grid max-w-3xl gap-4 sm:grid-cols-3">
            <Price tier="Starter" price="Free" note="25 credits every month" />
            <Price tier="Pro" price="$19" note="500 credits a month" />
            <Price tier="Scale" price="$0.02" note="Per credit, pay as you go" />
          </div>
          {ACTIVE_CHAIN.testnet && (
            <p
              data-rise
              className="text-l5 mt-6 max-w-2xl text-sm leading-relaxed"
            >
              Free during the beta. These are the prices for when xmail moves to
              mainnet; nothing is charged on a test network.
            </p>
          )}
        </Slide>

        <Slide n={6} field="center">
          <Eyebrow>What&rsquo;s next</Eyebrow>
          <H>Where this goes</H>
          {/* Labelled as planned in the copy, not only in a footnote. A deck
              whose argument is verifiability cannot blur what is shipped and
              what is intended. */}
          <p
            data-rise
            className="text-l4 mt-6 max-w-2xl text-pretty leading-relaxed"
          >
            Everything below is planned, not shipped. Dates are intentions
            rather than commitments.
          </p>
          <div data-depth="0.6" className="mt-8 max-w-2xl space-y-5">
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
            <Next t="Larger attachments" d="Same encryption, more room." />
          </div>
        </Slide>

        <Slide n={7} field="bottom">
          <h2 className="text-4xl leading-[1.08] sm:text-6xl">
            <Reveal text="Send something you&rsquo;d" block />
            <Reveal text="rather not send over email" block />
          </h2>
          <p
            data-rise
            className="text-l3 mx-auto mt-6 max-w-xl text-pretty text-lg leading-relaxed"
          >
            Connect a wallet and write a message. There is nothing to sign up
            for and nothing to uninstall if you decide against it.
          </p>
          <div
            data-rise
            className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
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
          <p data-rise className="text-l5 mt-10 text-sm">
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
       * overflow-y-auto, not overflow-hidden: the pricing slide is taller than
       * an 812px phone viewport, and hidden overflow makes its last line -- the
       * one saying nothing is charged yet -- unreachable.
       *
       * And no `overscroll-contain`. It was here to keep a tall slide's inner
       * scroll from leaking into the deck, but it did that by killing scroll
       * chaining outright: a wheel over any slide with nothing to scroll was
       * swallowed rather than passed up, so the deck would not advance at all.
       *
       * Centring is `my-auto` on the child rather than `items-center` here,
       * because a centred flex child that overflows loses its TOP to the clip
       * and cannot be scrolled back to.
       */
      className="relative flex h-full w-full shrink-0 snap-start overflow-y-auto"
    >
      <SectionField variant={field} />
      <div
        className={`container relative mx-auto my-auto px-6 py-16 ${centred ? "text-center" : ""}`}
      >
        <div className={centred ? "mx-auto max-w-3xl" : "mx-auto max-w-4xl"}>
          {children}
        </div>
      </div>
    </section>
  );
}

/**
 * Word-by-word reveal.
 *
 * Words are wrapped individually rather than the line being masked as one
 * block, and the difference is the whole effect: a single mask slides one slab
 * of type into place, where this reads as the sentence assembling itself.
 *
 * The padding is not decoration. `overflow-hidden` cuts descenders (g, y, p)
 * off square, and the matching negative margin buys the clip room back without
 * changing the line box.
 *
 * The separator between words is a REAL space, not a fixed-width span. An
 * earlier version spaced the words with an empty element, which looked
 * identical and was wrong everywhere it counted: textContent came out as
 * "Yourwalletistheaddress", so screen readers said that, copy-paste produced
 * that, and so did anything reading the page for search.
 */
function Reveal({ text, block = false }: { text: string; block?: boolean }) {
  return (
    <span className={block ? "block" : "inline"}>
      {text.split(" ").map((word, i) => (
        <Fragment key={`${word}-${i}`}>
          <span className="-mb-[0.16em] inline-block overflow-hidden pb-[0.16em] align-bottom">
            <span className="rv-inner inline-block">{word}</span>
          </span>{" "}
        </Fragment>
      ))}
    </span>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span data-rise className="text-l5 block text-xs uppercase tracking-[0.18em]">
      {children}
    </span>
  );
}

function H({ children }: { children: string }) {
  return (
    <h2 className="mt-5 text-4xl leading-[1.08] sm:text-6xl">
      <Reveal text={children} />
    </h2>
  );
}

function Card({ t, d }: { t: string; d: string }) {
  return (
    <div data-card className="panel p-4">
      <p className="text-base">{t}</p>
      <p className="text-l4 mt-2 text-pretty text-sm leading-relaxed">{d}</p>
    </div>
  );
}

/**
 * A stat is either a number that counts up or a word that rises.
 *
 * React renders the true value as the element's own text, and GSAP only writes
 * over it while the count is running. That ordering matters: the anchored
 * figure arrives from the chain AFTER the timeline is built, and an earlier
 * version rendered an em-dash until it landed -- so the tween was created
 * against an element with no target, counted to zero, and the slide sat there
 * claiming nought messages had ever been anchored. On a deck whose whole
 * argument is "check it yourself", a confidently wrong number is worse than no
 * number.
 *
 * Now the span is always the same element, so when the value arrives React
 * patches the text in place whatever GSAP last wrote, and `data-count` is read
 * inside onUpdate rather than captured when the tween was made. Whichever
 * arrives first, the number ends up right.
 */
function Stat({
  value,
  text,
  l,
}: {
  value?: number | null;
  text?: string;
  l: string;
}) {
  if (text !== undefined) {
    return (
      <div data-card>
        <p className="text-2xl sm:text-3xl">{text}</p>
        <p className="text-l4 mt-2 text-pretty text-sm leading-relaxed">{l}</p>
      </div>
    );
  }
  const known = typeof value === "number";
  return (
    <div data-card>
      <p className="text-3xl sm:text-4xl">
        <span data-count={known ? value : undefined}>
          {known ? value.toLocaleString() : "—"}
        </span>
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
    <div data-card className="panel p-5">
      <p className="text-l4 text-xs uppercase tracking-wider">{tier}</p>
      <p className="mt-2 text-3xl">{price}</p>
      <p className="text-l4 mt-1 text-pretty text-sm leading-relaxed">{note}</p>
    </div>
  );
}

function Next({ t, d }: { t: string; d: string }) {
  return (
    <div data-card className="flex gap-4">
      <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-white/30" />
      <div>
        <p className="text-base">{t}</p>
        <p className="text-l4 mt-1 text-pretty text-sm leading-relaxed">{d}</p>
      </div>
    </div>
  );
}

/**
 * What happens to a message, drawn rather than described.
 *
 * A diagram of the mechanism, not a chart. There is no dataset here worth
 * plotting, and inventing one to decorate a deck whose argument is "check it
 * yourself" would be precisely the wrong move. The connector draws left to
 * right as the slide arrives, so the sequence reads in the order it happens.
 */
function ProofDiagram() {
  const STEPS = [
    { k: "Your message", v: "plaintext, in your browser" },
    { k: "Ciphertext", v: "AES-256-GCM" },
    { k: "keccak256", v: "the fingerprint" },
    { k: "On-chain", v: "signed by you" },
  ];
  return (
    <div className="relative mt-10 max-w-3xl">
      {/* Hidden below sm, where the steps stack into two columns and a
          horizontal rule through them would be drawing a line to nowhere. */}
      <svg
        className="pointer-events-none absolute inset-x-0 top-[18px] hidden h-1 w-full sm:block"
        viewBox="0 0 100 1"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          data-draw
          d="M 3 0.5 L 97 0.5"
          stroke="hsl(0 0% 100% / 0.16)"
          strokeWidth="0.6"
          fill="none"
        />
      </svg>
      {/* The dot that runs the line. A static rule says these four things are
          connected; a moving one says something passes THROUGH them, which is
          what a commitment pipeline actually does. */}
      <div className="pointer-events-none absolute inset-x-0 top-[14px] hidden h-2 sm:block">
        <div className="relative mx-[3%] h-full w-[94%]">
          <span
            data-pulse
            className="absolute top-0 block h-2 w-2 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary))]"
          />
        </div>
      </div>
      <ol className="relative grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4">
        {STEPS.map((s, i) => (
          <li key={s.k} data-node className="flex flex-col items-start">
            <span className="panel flex h-9 w-9 items-center justify-center rounded-full font-mono text-xs">
              {i + 1}
            </span>
            <span className="mt-3 text-sm">{s.k}</span>
            <span className="text-l5 mt-0.5 font-mono text-[11px]">{s.v}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
