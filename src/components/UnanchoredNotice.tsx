import { useCallback, useEffect, useRef, useState } from "react";
import { Link2, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/useWallet";
import { useSelfAnchor } from "@/hooks/useSelfAnchor";
import { useToast } from "@/hooks/use-toast";
import { callSecureEndpoint } from "@/lib/secureApi";
import { emitMailChanged, onMailChanged } from "@/lib/events";
import { ACTIVE_CHAIN, isDeployed } from "@/config/chain";

/**
 * Messages you sent that never got anchored.
 *
 * Anchoring runs after the send, which is deliberate -- anchor() reverts on a
 * duplicate hash, so anchoring first would leave a message permanently
 * unanchorable if the send then failed. The cost of that ordering is that a
 * declined signature, an empty wallet or a busy chain leaves mail delivered but
 * unproven, and nothing said so. You had to open a message and notice.
 *
 * Each anchor is its own transaction, so this walks them one at a time rather
 * than pretending a batch is one click. Stops on the first failure, because
 * queueing up five more wallet prompts after one was declined is hostile.
 */
export function UnanchoredNotice() {
  const { address, signMessage } = useWallet();
  const { anchorMessage } = useSelfAnchor();
  const { toast } = useToast();

  const [pending, setPending] = useState<
    { id: string; encrypted_body: string; to_wallet: string }[]
  >([]);
  const [working, setWorking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const loading = useRef(false);

  const refresh = useCallback(async () => {
    if (!address || !isDeployed || loading.current) return;
    loading.current = true;
    try {
      const res = await callSecureEndpoint("get_unanchored", {}, address, signMessage);
      setPending(res.messages ?? []);
    } catch (err) {
      console.error("Could not check for unanchored messages:", err);
    } finally {
      loading.current = false;
    }
  }, [address, signMessage]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Sending creates a new one of these, so the notice stays honest.
  useEffect(() => onMailChanged(() => void refresh()), [refresh]);

  const anchorAll = async () => {
    setWorking(true);
    let done = 0;
    for (const m of pending) {
      setProgress(done);
      const ok = await anchorMessage(m.id, m.encrypted_body, m.to_wallet);
      if (!ok) {
        toast({
          title: done > 0 ? `Anchored ${done} of ${pending.length}` : "Not anchored",
          description: "Stopped there. The messages themselves are unaffected.",
          variant: "destructive",
        });
        break;
      }
      done += 1;
    }
    setWorking(false);
    setProgress(0);
    if (done > 0) {
      toast({ title: done === 1 ? "Message anchored" : `${done} messages anchored` });
      emitMailChanged();
    }
    await refresh();
  };

  if (dismissed || pending.length === 0) return null;

  return (
    <div className="flex items-start gap-3 border-b border-border/60 bg-white/[0.02] px-4 py-3">
      <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          {pending.length === 1
            ? "One sent message is not anchored on-chain"
            : `${pending.length} sent messages are not anchored on-chain`}
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          They were delivered and are still encrypted — but without an anchor there
          is nothing to verify them against. Anchoring costs a fraction of a cent
          on {ACTIVE_CHAIN.shortName}, one wallet confirmation each.
        </p>
      </div>
      <Button size="sm" variant="outline" onClick={anchorAll} disabled={working} className="shrink-0">
        {working ? (
          <>
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            {progress + 1} of {pending.length}
          </>
        ) : pending.length === 1 ? (
          "Anchor it"
        ) : (
          "Anchor them"
        )}
      </Button>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
