import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  RotateCcw,
  Blocks,
} from "lucide-react";
import {
  publicClient,
  messageCommitment,
  verifyAnchor,
  readTotalAnchored,
} from "@/lib/chainClient";
import {
  ACTIVE_CHAIN,
  REFERENCE_PROOF,
  isDeployed,
  explorerTx,
  explorerAddress,
  CONTRACTS,
} from "@/config/chain";
import { cn } from "@/lib/utils";
import { SectionField } from "./SectionField";

type Status =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "verified"; timestamp: bigint; blockNumber: bigint }
  | { kind: "absent" }
  | { kind: "error"; message: string };

export function LiveChainProof() {
  const [text, setText] = useState(REFERENCE_PROOF.preimage);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [total, setTotal] = useState<bigint | null>(null);
  const [blockHeight, setBlockHeight] = useState<bigint | null>(null);
  const requestId = useRef(0);

  const isPristine = text === REFERENCE_PROOF.preimage;

  const hash = useMemo(
    () =>
      messageCommitment(
        text,
        REFERENCE_PROOF.participant,
        REFERENCE_PROOF.participant,
      ),
    [text],
  );

  // Live chain stats, so the section shows the chain is real and moving.
  useEffect(() => {
    if (!isDeployed) return;
    let cancelled = false;

    const load = async () => {
      try {
        const [count, block] = await Promise.all([
          readTotalAnchored(),
          publicClient.getBlockNumber(),
        ]);
        if (!cancelled) {
          setTotal(count);
          setBlockHeight(block);
        }
      } catch {
        /* stats are decorative; the verification below is the real claim */
      }
    };

    load();
    const timer = setInterval(load, 12_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const verify = useCallback(async (h: `0x${string}`) => {
    if (!isDeployed) return;
    const id = ++requestId.current;
    setStatus({ kind: "checking" });
    try {
      const { verified, timestamp, blockNumber } = await verifyAnchor(
        h,
        REFERENCE_PROOF.participant,
        REFERENCE_PROOF.participant,
      );
      // A newer keystroke may have superseded this request.
      if (id !== requestId.current) return;
      setStatus(
        verified
          ? { kind: "verified", timestamp, blockNumber }
          : { kind: "absent" },
      );
    } catch (error) {
      if (id !== requestId.current) return;
      setStatus({
        kind: "error",
        message: error instanceof Error ? error.message : "RPC call failed",
      });
    }
  }, []);

  // Debounced so typing doesn't hammer the public RPC.
  useEffect(() => {
    const t = setTimeout(() => verify(hash), 350);
    return () => clearTimeout(t);
  }, [hash, verify]);

  if (!isDeployed) return null;

  return (
    <section
      id="verify"
      className="relative overflow-hidden py-24 sm:py-32"
      aria-labelledby="verify-heading"
    >
      <SectionField variant="right" />
      <div className="container mx-auto px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="panel pill inline-flex items-center gap-2 px-3 py-1 text-xs text-l4">
            <Blocks className="h-3.5 w-3.5" />
            Live on {ACTIVE_CHAIN.shortName}
          </span>
          <h2
            id="verify-heading"
            className="mt-5 text-balance text-4xl sm:text-5xl"
          >
            Don&rsquo;t trust us. Check the chain.
          </h2>
          <p className="text-l3 mx-auto mt-4 max-w-xl text-pretty text-lg">
            Below is a real message commitment, anchored in block{" "}
            {REFERENCE_PROOF.blockNumber.toLocaleString()}. Edit a single
            character and watch the hash stop matching &mdash; that is exactly
            what tamper detection looks like.
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-2xl">
          <div className="panel overflow-hidden shadow-[var(--shadow-lg)]">
            <div className="flex items-center justify-between gap-3 border-b border-border bg-[hsl(var(--surface-sunken))] px-5 py-3">
              <span className="text-l4 text-xs">Message content</span>
              {!isPristine && (
                <button
                  type="button"
                  onClick={() => setText(REFERENCE_PROOF.preimage)}
                  className="text-l4 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors hover:bg-muted hover:text-foreground"
                >
                  <RotateCcw className="h-3 w-3" />
                  Restore original
                </button>
              )}
            </div>

            <div className="p-5">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={2}
                spellCheck={false}
                aria-label="Message content to verify against the chain"
                className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2.5 font-mono text-sm outline-none transition-colors focus:border-primary/50"
              />

              <dl className="mt-5 space-y-3 text-xs">
                <Row label="keccak256 commitment">
                  <code className="text-l2 block break-all font-mono text-[11px]">
                    {hash}
                  </code>
                </Row>
                <Row label="Anchor contract">
                  <a
                    href={explorerAddress(CONTRACTS.messageAnchor)}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1 break-all font-mono text-[11px] text-primary hover:underline"
                  >
                    {CONTRACTS.messageAnchor}
                    <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                  </a>
                </Row>
              </dl>
            </div>

            <StatusBar status={status} isPristine={isPristine} />
          </div>

          <div className="text-l4 mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs">
            <Stat
              label="Anchored messages"
              value={total === null ? "—" : total.toString()}
            />
            <Stat
              label="Block height"
              value={blockHeight === null ? "—" : blockHeight.toLocaleString()}
            />
            <Stat label="Chain ID" value={String(ACTIVE_CHAIN.id)} />
          </div>
        </div>
      </div>
    </section>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-l4 mb-1">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-l1 tabular-nums">{value}</span>
      {label}
    </span>
  );
}

function StatusBar({
  status,
  isPristine,
}: {
  status: Status;
  isPristine: boolean;
}) {
  const base = "flex items-start gap-2.5 border-t px-5 py-4 text-sm";

  if (status.kind === "checking" || status.kind === "idle") {
    return (
      <div
        className={cn(
          base,
          "text-l4 border-border bg-[hsl(var(--surface-sunken))]",
        )}
      >
        <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />
        <span>Asking {ACTIVE_CHAIN.shortName}…</span>
      </div>
    );
  }

  if (status.kind === "error") {
    return (
      <div
        className={cn(
          base,
          "border-border bg-[hsl(var(--warning)/0.08)] text-foreground",
        )}
      >
        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--warning))]" />
        <span>
          Could not reach the chain. The public RPC is rate limited &mdash; a
          network problem, not a verification failure.
        </span>
      </div>
    );
  }

  if (status.kind === "verified") {
    return (
      <div
        className={cn(
          base,
          "border-[hsl(var(--verified)/0.25)] bg-[hsl(var(--verified)/0.08)]",
        )}
      >
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--verified))]" />
        <div className="min-w-0">
          <p className="text-[hsl(var(--verified))]">Verified on-chain</p>
          <p className="text-l4 mt-0.5 text-xs">
            Anchored in block {status.blockNumber.toLocaleString()} on{" "}
            {new Date(Number(status.timestamp) * 1000).toLocaleDateString(
              undefined,
              {
                year: "numeric",
                month: "short",
                day: "numeric",
              },
            )}
            .{" "}
            <a
              href={explorerTx(REFERENCE_PROOF.txHash)}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              View the transaction
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(base, "border-destructive/25 bg-destructive/[0.07]")}>
      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
      <div className="min-w-0">
        <p className="text-destructive">No matching anchor</p>
        <p className="text-l4 mt-0.5 text-xs">
          {isPristine
            ? "This commitment is not on the chain."
            : "You changed the content, so the hash changed. A recipient would see this instead of a verified badge — the message could not be passed off as the original."}
        </p>
      </div>
    </div>
  );
}
