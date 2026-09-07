import { useEffect, useState } from "react";
import { publicClient, readTotalAnchored } from "@/lib/chainClient";
import { ACTIVE_CHAIN, isDeployed } from "@/config/chain";

/**
 * The metrics band.
 *
 * Two of these four are read live from Robinhood Chain rather than typed into
 * the markup. A landing page that invents its own numbers is the thing this
 * product is supposed to be the opposite of.
 */
export function Stats() {
  const [anchored, setAnchored] = useState<bigint | null>(null);
  const [block, setBlock] = useState<bigint | null>(null);
  useEffect(() => {
    if (!isDeployed) return;
    let cancelled = false;
    const load = async () => {
      try {
        const [count, height] = await Promise.all([
          readTotalAnchored(),
          publicClient.getBlockNumber(),
        ]);
        if (!cancelled) {
          setAnchored(count);
          setBlock(height);
        }
      } catch {
        /* leave as em-dash rather than showing a made-up number */
      }
    };
    load();
    const t = setInterval(load, 15_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);
  const items = [
    { value: "AES-256", label: "GCM encryption", live: false },
    { value: "RSA-2048", label: "Key wrapping", live: false },
    {
      value: anchored === null ? "—" : anchored.toString(),
      label: "Messages anchored",
      live: true,
    },
    {
      value: block === null ? "—" : block.toLocaleString(),
      label: `${ACTIVE_CHAIN.shortName} block`,
      live: true,
    },
  ];
  return (
    <section
      className="border-y border-border/60 py-12"
      aria-label="Key metrics"
    >
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {items.map((item) => (
            <div key={item.label} className="text-center">
              <div className="text-l1 text-2xl tabular-nums sm:text-3xl">
                {item.value}
              </div>
              <div className="text-l4 mt-1 flex items-center justify-center gap-1.5 text-xs">
                {item.live && isDeployed && (
                  <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--verified))]" />
                )}
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
