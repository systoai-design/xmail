import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { Shield, Cpu, Link2, ChevronRight } from "lucide-react";
import { LAYERS, type LayerId } from "./layerData";
import { cn } from "@/lib/utils";
import { SectionField } from "./SectionField";

// A purpose-built scene: each layer is its own object with its own motion, which
// an ambient background component cannot express (its only lever is scale, so
// selection reads as a zoom). Code-split -- WebGL is the heaviest thing on the
// page and nobody should pay for it before they scroll to it.
const LayerScene = lazy(() => import("./LayerScene"));
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/** True once the node has been near the viewport; stays true so we don't thrash. */
function useNearViewport<T extends HTMLElement>(rootMargin = "200px") {
  const ref = useRef<T>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node || near) return;
    const io = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setNear(true),
      { rootMargin },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [near, rootMargin]);
  return { ref, near };
}
export function EncryptionLayers() {
  const [activeId, setActiveId] = useState<LayerId | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const { ref, near } = useNearViewport<HTMLDivElement>();
  // `displayed` lags `activeId` by one exit tween, so the outgoing copy can
  // animate out before the content swaps. Reading `active` directly would make
  // the old text vanish on frame one, which is what key={} was doing.
  const [displayed, setDisplayed] = useState<LayerId | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const active = LAYERS.find((l) => l.id === displayed) ?? null;

  useGSAP(
    () => {
      const node = panelRef.current;
      if (!node) return;

      if (reducedMotion) {
        setDisplayed(activeId);
        gsap.set(node, { opacity: 1, y: 0 });
        return;
      }

      const tl = gsap.timeline();
      if (displayed !== null) {
        tl.to(node, { opacity: 0, y: -8, duration: 0.18, ease: "power2.in" });
      }
      tl.add(() => setDisplayed(activeId));
      tl.fromTo(
        node,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.32, ease: "expo.out" },
      );
    },
    { dependencies: [activeId, reducedMotion] },
  );

  return (
    <section
      ref={ref}
      className="relative overflow-hidden py-24 sm:py-32"
      aria-labelledby="layers-heading"
    >
      <SectionField variant="bottom" />
      <div className="container mx-auto px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <Shield className="h-3.5 w-3.5" />
            How it protects you
          </span>
          <h2
            id="layers-heading"
            className="mt-5 text-balance text-4xl sm:text-5xl"
          >
            Six layers, and you can look inside every one
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-lg text-muted-foreground">
            Most encrypted products ask you to take their word for it. Pick a
            layer to see exactly what protects your message, and which parts
            anyone can verify independently.
          </p>
        </div>

        <div className="mt-16 grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
          {/* --- the scene ------------------------------------------------ */}
          <div className="relative aspect-square w-full max-w-[560px] justify-self-center lg:max-w-none">
            <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_45%,hsl(var(--primary)/0.10),transparent_62%)]" />
            {near && !reducedMotion ? (
              <Suspense fallback={<SceneSkeleton />}>
                <LayerScene activeId={activeId} reducedMotion={reducedMotion} />
              </Suspense>
            ) : (
              <SceneSkeleton />
            )}

            <p className="pointer-events-none absolute inset-x-0 bottom-1 text-center text-xs text-muted-foreground/70">
              {active
                ? "Select again to deselect"
                : "Pick a layer to inspect it"}
            </p>
          </div>

          {/* --- the legend ----------------------------------------------- */}
          <div className="space-y-2">
            {LAYERS.map((layer) => {
              const isActive = layer.id === activeId;
              return (
                <button
                  key={layer.id}
                  type="button"
                  onClick={() =>
                    setActiveId((cur) => (cur === layer.id ? null : layer.id))
                  }
                  aria-pressed={isActive}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-200",
                    isActive
                      ? "border-primary/40 bg-card shadow-[var(--shadow-md)]"
                      : "border-transparent bg-transparent hover:border-border hover:bg-card/60",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs tabular-nums transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {layer.index}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm">{layer.label}</span>
                      {layer.domain === "chain" && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[hsl(var(--verified)/0.12)] px-1.5 py-0.5 text-[10px] text-[hsl(var(--verified))]">
                          <Link2 className="h-2.5 w-2.5" /> on-chain
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block truncate font-mono text-xs text-muted-foreground">
                      {layer.spec}
                    </span>
                  </span>
                  <ChevronRight
                    className={cn(
                      "h-4 w-4 shrink-0 transition-transform duration-200",
                      isActive
                        ? "rotate-90 text-primary"
                        : "text-muted-foreground/40",
                    )}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* --- detail --------------------------------------------------- */}
        {/* min-h is load-bearing: it prevents the layout jump during the swap. */}
        <div className="mx-auto mt-10 min-h-[132px] max-w-3xl">
          <div ref={panelRef}>
            {active ? (
              <div className="panel p-6 sm:p-8">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
                    {active.spec}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    {active.domain === "chain" ? (
                      <>
                        <Link2 className="h-3 w-3" /> verifiable by anyone
                      </>
                    ) : (
                      <>
                        <Cpu className="h-3 w-3" /> runs on your device
                      </>
                    )}
                  </span>
                </div>
                <h3 className="mt-3 text-xl sm:text-2xl">{active.headline}</h3>
                <p className="mt-2 text-pretty leading-relaxed text-muted-foreground">
                  {active.body}
                </p>
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground">
                Nothing selected. The shells are drawn to scale in the order
                they wrap your message.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
function SceneSkeleton() {
  return (
    <div
      className="flex h-full w-full items-center justify-center"
      aria-hidden="true"
    >
      <div className="relative h-3/4 w-3/4">
        {[0.42, 0.58, 0.74, 0.88, 1].map((scale, i) => (
          <div
            key={i}
            className="absolute inset-0 m-auto rounded-full border border-border/60"
            style={{ width: `${scale * 100}%`, height: `${scale * 100}%` }}
          />
        ))}
      </div>
    </div>
  );
}
