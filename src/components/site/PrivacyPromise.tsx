import { useRef, type CSSProperties } from "react";
import { EyeOff } from "lucide-react";
import { Player, type PlayerRef } from "@remotion/player";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { SectionField } from "./SectionField";
import {
  EncryptionReveal,
  DURATION_IN_FRAMES,
  FPS,
} from "@/remotion/EncryptionReveal";

gsap.registerPlugin(ScrollTrigger);

/**
 * The privacy promise.
 *
 * One pinned stage, one dragged sentence. The strip is a single row --
 * [panel exactly one viewport wide][the sentence] -- so the headline fills the
 * screen, then leaves to the left as the claim comes through. The five promises
 * used to be a card grid; a grid states things, a sentence you have to scroll
 * through makes you read them.
 *
 * Two layers, not one timeline, and the split IS the character: the drag is one
 * `ease: "none"` tween on x, while every chip fires its own spring entrance via
 * `containerAnimation` as it crosses the viewport horizontally. Scrubbing the
 * entrances too would mean nothing ever arrives under its own power, and the
 * whole band reads as a sheet sliding past.
 *
 * Colour is the deliberate departure from gsap.com, which codes five vivid hues
 * as a taxonomy. xmail is achromatic, so the chips are cream-on-near-black --
 * the same surface pairing, without the category colours.
 *
 * Two claims are narrower than the obvious marketing version, because they are
 * false as built otherwise: we *do* store your mail (as ciphertext we cannot
 * open), and sender/recipient/timestamp are plaintext so mail can be routed at
 * all. Pseudonymous, not anonymous.
 */

type Piece =
  | { t: "word"; v: string }
  | { t: "chip"; v: string; tone?: "solid" | "outline" }
  | { t: "dot"; v: "disc" | "ring" | "square" }
  /* `lift` is in em of the track's own font size, so a mark holds its position
     relative to the words at every clamp step instead of drifting as type scales. */
  | { t: "deco"; v: string; lift: number; spin?: boolean; over?: boolean };

const LINE: Piece[] = [
  { t: "word", v: "xmail" },
  { t: "chip", v: "cannot read your mail" },
  { t: "dot", v: "disc" },
  { t: "word", v: "stores" },
  { t: "chip", v: "nothing it can open", tone: "outline" },
  { t: "deco", v: "plus", lift: -0.48 },
  { t: "word", v: "runs" },
  { t: "chip", v: "no analytics, no pixels" },
  { t: "deco", v: "burst", lift: 1.5, spin: true, over: true },
  { t: "dot", v: "ring" },
  { t: "word", v: "anchors every message" },
  { t: "chip", v: "on-chain", tone: "outline" },
  { t: "deco", v: "arc", lift: -0.52 },
  { t: "word", v: "the moment you send it, and never asks for a" },
  { t: "dot", v: "square" },
  { t: "chip", v: "name, a number, or a signup" },
  { t: "deco", v: "ring", lift: 1.4, spin: true, over: true },
];

/** Each mark drifts its own distance so the field has depth. */
const MARKS = [
  { k: "ring", drift: -0.9 },
  { k: "arc", drift: 0.55 },
  { k: "plus", drift: -0.6 },
  { k: "square", drift: 0.8 },
  { k: "burst", drift: 0.42 },
];

function Mark({ k }: { k: string }) {
  const s = {
    fill: "none",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    stroke: "hsl(var(--foreground) / 0.75)",
  };
  switch (k) {
    case "arc":
      return (
        <svg viewBox="0 0 64 40" aria-hidden>
          <path {...s} strokeWidth="5" d="M4 36a28 28 0 0 1 56 0" />
        </svg>
      );
    case "plus":
      return (
        <svg viewBox="0 0 36 36" aria-hidden>
          <path {...s} strokeWidth="5" d="M18 5v26M5 18h26" />
        </svg>
      );
    case "square":
      return (
        <svg viewBox="0 0 40 40" aria-hidden>
          <rect {...s} strokeWidth="4" x="6" y="6" width="28" height="28" rx="6" />
        </svg>
      );
    case "burst":
      return (
        <svg viewBox="0 0 44 44" aria-hidden>
          <g {...s} strokeWidth="3">
            <path d="M22 3v38M3 22h38M8.7 8.7l26.6 26.6M35.3 8.7L8.7 35.3" />
          </g>
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 40 40" aria-hidden>
          <circle {...s} strokeWidth="5" cx="20" cy="20" r="15" />
        </svg>
      );
  }
}

export function PrivacyPromise() {
  const claim = useRef<HTMLElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const player = useRef<PlayerRef>(null);

  useGSAP(
    () => {
      const el = claim.current;
      if (!el) return;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const wide = window.matchMedia("(min-width: 900px)").matches;
      const q = gsap.utils.selector(el);

      // A pinned horizontal drag has no sane phone equivalent, and under
      // reduced motion it is exactly the vestibular effect to avoid. Both fall
      // back to the same static prose, which still says everything.
      if (reduced || !wide) {
        el.setAttribute("data-static", "true");
        player.current?.seekTo(DURATION_IN_FRAMES - 1);
        return;
      }

      // clientWidth, not 100vw: vw counts the scrollbar gutter, which would
      // make panel one wider than the screen.
      const setPanel = () =>
        el.style.setProperty("--pc-vw", document.documentElement.clientWidth + "px");
      setPanel();
      window.addEventListener("resize", setPanel);

      // The reference holds roughly 2.6px of travel per 1px scrolled. The ratio
      // is the transferable part, not the literal distance: it sets the pace.
      const RATIO = 2.6;
      const travel = () => Math.max(0, (strip.current?.scrollWidth ?? 0) - window.innerWidth);
      const dragPx = () => Math.round(travel() / RATIO);

      const drag = gsap.to(strip.current, {
        x: () => -travel(),
        ease: "none",
        scrollTrigger: {
          trigger: el,
          start: "top top",
          end: () => "+=" + dragPx(),
          scrub: 1,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          // A pin must refresh before anything below it, or their offsets come
          // out short by the whole drag distance.
          refreshPriority: 2,
        },
      });

      // The headline runs on page scroll, not the container: it is already on
      // screen when the pin engages. The blocks keep a flat wipe because a
      // highlight that springs sideways reads as a glitch; the words behind
      // them get the elastic.
      gsap.to(q(".pc__mark"), {
        scaleX: 1,
        ease: "power4.out",
        duration: 0.9,
        stagger: 0.18,
        scrollTrigger: { trigger: el, start: "top 70%", toggleActions: "play none none reverse" },
      });
      gsap.from(q(".pc__text"), {
        yPercent: 110,
        autoAlpha: 0,
        ease: "elastic.out(1, 0.75)",
        duration: 1.1,
        stagger: 0.18,
        scrollTrigger: { trigger: el, start: "top 70%", toggleActions: "play none none reverse" },
      });
      gsap.from(q(".pc__sub"), {
        y: 20,
        autoAlpha: 0,
        ease: "power3.out",
        duration: 0.7,
        scrollTrigger: { trigger: el, start: "top 55%", toggleActions: "play none none reverse" },
      });

      // containerAnimation ties a trigger's progress to the horizontal tween
      // rather than to page scroll, so "left 88%" means "when this element is
      // 88% across the viewport" -- each chip pops as it arrives instead of
      // being pre-animated off-screen where nobody sees it.
      const enter = (sel: string, vars: gsap.TweenVars, start = "left 88%") =>
        q<HTMLElement>(sel).forEach((node) =>
          gsap.from(node, {
            ...vars,
            scrollTrigger: {
              trigger: node,
              containerAnimation: drag,
              start,
              toggleActions: "play none none reverse",
            },
          }),
        );

      enter(".pc__chip", { yPercent: -160, autoAlpha: 0, ease: "elastic.out(1, 0.75)", duration: 0.7 });
      enter(".pc__dot", { scale: 0, autoAlpha: 0, ease: "back.out(1.7)", duration: 0.6 });
      enter(".pc__inline", { scale: 0, rotation: -50, autoAlpha: 0, ease: "elastic.out(1, 0.6)", duration: 1.1 }, "left 95%");

      // A field where everything pops reads as a slideshow; one where everything
      // tracks the scrollbar reads as a flat sheet. These few keep turning for
      // as long as the strip moves past them.
      q<HTMLElement>(".pc__inline--spin").forEach((node, i) => {
        gsap.to(node, {
          rotation: i % 2 ? -150 : 190,
          ease: "none",
          scrollTrigger: { trigger: node, containerAnimation: drag, start: "left right", end: "right left", scrub: 1 },
        });
      });

      // Scroll scrubs the encryption rather than looping it, so the reader
      // performs it instead of watching it happen at them.
      ScrollTrigger.create({
        trigger: stage.current,
        start: "top 85%",
        end: "bottom 15%",
        scrub: 0.6,
        onUpdate: (self) =>
          player.current?.seekTo(Math.round(self.progress * (DURATION_IN_FRAMES - 1))),
      });

      gsap.utils.toArray<HTMLElement>(".privacy-rise").forEach((node) => {
        ScrollTrigger.create({
          trigger: node,
          start: "top 88%",
          once: true,
          // Never `from`: that hides the element at creation and only restores
          // it if the trigger later runs. A stale position once stranded an
          // entire card grid at opacity 0.
          onEnter: () =>
            gsap.fromTo(node, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: "expo.out" }),
        });
      });

      const refresh = () => ScrollTrigger.refresh();
      window.addEventListener("load", refresh);
      return () => {
        window.removeEventListener("resize", setPanel);
        window.removeEventListener("load", refresh);
      };
    },
    { scope: claim },
  );

  return (
    <>
      <section id="privacy" ref={claim} className="pc" aria-labelledby="privacy-heading">
        <SectionField variant="left" />

        <div className="pc__strip" ref={strip}>
          <div className="pc__panel">
            <div className="container relative mx-auto px-6">
              <span className="panel pill inline-flex items-center gap-2 px-3 py-1 text-xs text-l4">
                <EyeOff className="h-3.5 w-3.5" />
                Privacy by construction
              </span>

              <h2
                id="privacy-heading"
                className="mt-5 flex flex-col items-start gap-2.5"
              >
                <span className="pc__line">
                  <span className="pc__mark" aria-hidden />
                  <span className="pc__text">Encryption isn&rsquo;t a setting.</span>
                </span>
                <span className="pc__line pc__line--alt">
                  <span className="pc__mark" aria-hidden />
                  <span className="pc__text">It&rsquo;s the architecture.</span>
                </span>
              </h2>

              <p className="pc__sub text-l3 mt-7 max-w-xl text-pretty text-lg">
                Most mail providers promise not to look. We built something that
                cannot look, then put the proof on a public chain so you can
                check the promise instead of trusting it.
              </p>
            </div>
          </div>

          {/* The sentence begins where panel one ends: they are neighbours in
              one row, not two separately-aligned blocks. */}
          <div className="pc__track">
            {LINE.map((p, i) =>
              p.t === "deco" ? (
                <span
                  key={i}
                  aria-hidden
                  style={{ "--lift": p.lift + "em" } as CSSProperties}
                  className={
                    "pc__inline" +
                    (p.spin ? " pc__inline--spin" : "") +
                    (p.over ? " pc__inline--over" : "")
                  }
                >
                  <Mark k={p.v} />
                </span>
              ) : p.t === "dot" ? (
                <span key={i} aria-hidden className={`pc__dot pc__dot--${p.v}`} />
              ) : p.t === "chip" ? (
                <span
                  key={i}
                  className={"pc__chip" + (p.tone === "outline" ? " pc__chip--outline" : "")}
                >
                  {p.v}
                </span>
              ) : (
                <span key={i}>{p.v}</span>
              ),
            )}
          </div>
        </div>
      </section>

      {/* The proof, and the caveat that makes the proof worth believing.
          Rounded into one panel rather than running full-bleed: a band that
          spans the whole viewport needs an edge to end on, and any edge between
          two surfaces this close in tone reads as a stray rule. A corner radius
          ends the surface without drawing a line. */}
      <section className="relative py-14 sm:py-20" aria-label="Encryption proof">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-[28px] bg-[hsl(var(--surface-sunken))] px-5 py-16 sm:rounded-[36px] sm:px-10 sm:py-20">
            <SectionField variant="right" />

            <div
              ref={stage}
              className="privacy-rise relative mx-auto max-w-5xl"
              aria-hidden="true"
            >
              <Player
                ref={player}
                component={EncryptionReveal}
                durationInFrames={DURATION_IN_FRAMES}
                fps={FPS}
                compositionWidth={960}
                compositionHeight={400}
                style={{ width: "100%" }}
                controls={false}
                clickToPlay={false}
                doubleClickToFullscreen={false}
                spaceKeyToPlayOrPause={false}
                acknowledgeRemotionLicense
              />
            </div>
            <p className="sr-only">
              An animation showing a message being written, then scrambled into
              ciphertext, while the sender address, recipient address and send
              time stay readable.
            </p>

            {/* Same measure as the composition above it, so their edges line up
                instead of the caption being mysteriously wider than the thing
                it captions. */}
            <div className="privacy-rise relative mx-auto mt-12 max-w-5xl">
              <h3 className="text-base">What we can still see</h3>
              <p className="text-l3 mt-3 max-w-3xl text-pretty leading-relaxed">
                Delivery needs an envelope. Sender address, recipient address
                and send time are stored unencrypted, because without them a
                message cannot be routed to your mailbox at all. Contents,
                subject lines and attachments are never readable to us. We call
                that pseudonymous rather than anonymous, because that is what it
                is.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
