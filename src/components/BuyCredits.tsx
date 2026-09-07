import { useEffect, useState } from "react";
import { useWriteContract, usePublicClient } from "wagmi";
import { Coins, Loader2, ExternalLink, ShieldCheck, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useWallet } from "@/hooks/useWallet";
import { useToast } from "@/hooks/use-toast";
import { callSecureEndpoint } from "@/lib/secureApi";
import { emitCreditsChanged } from "@/lib/events";
import { ACTIVE_CHAIN } from "@/config/chain";
import { robinhoodChain } from "@/lib/wagmi";

/**
 * Buying credits.
 *
 * The payment goes through CreditSale rather than a bare transfer, because a
 * transfer says only "someone paid" -- credits have to land in a specific
 * mailbox, so the account is passed into the call and recorded in the event.
 *
 * Nothing about the price is decided here. The server quotes it, and the server
 * re-checks the amount actually paid against the live ETH price when the
 * payment is claimed. This component only shows the number and sends the
 * transaction.
 */

const SALE_ABI = [
  {
    type: "function",
    name: "buy",
    stateMutability: "payable",
    inputs: [{ name: "accountHash", type: "bytes32" }],
    outputs: [],
  },
] as const;

interface Quote {
  contract: `0x${string}`;
  credits: number;
  usdCents: number;
  ethUsd: number;
  amountWei: string;
  accountHash: `0x${string}`;
  isAdmin: boolean;
}

export function BuyCredits({ trigger }: { trigger?: React.ReactNode }) {
  const { address, signMessage, wrongChain, switchToChain } = useWallet();
  const { toast } = useToast();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [open, setOpen] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<"idle" | "paying" | "confirming" | "claiming">("idle");

  useEffect(() => {
    if (!open || !address) return;
    setLoading(true);
    callSecureEndpoint("get_credit_quote", {}, address, signMessage)
      .then(setQuote)
      .catch((err) => {
        console.error("Could not price credits:", err);
        toast({ title: "Could not load the price", variant: "destructive" });
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, address]);

  const amountEth = quote ? Number(quote.amountWei) / 1e18 : 0;

  const buy = async () => {
    if (!quote || !address) return;
    if (wrongChain && !(await switchToChain())) {
      toast({ title: `Switch to ${ACTIVE_CHAIN.name} to pay`, variant: "destructive" });
      return;
    }

    try {
      setStage("paying");
      const txHash = await writeContractAsync({
        address: quote.contract,
        abi: SALE_ABI,
        functionName: "buy",
        args: [quote.accountHash],
        value: BigInt(quote.amountWei),
        chain: robinhoodChain,
        account: address as `0x${string}`,
      });

      // Claiming before the transaction is mined would just 404. Waiting here
      // is the difference between "it worked" and "try again in a bit".
      setStage("confirming");
      await publicClient?.waitForTransactionReceipt({ hash: txHash, timeout: 90_000 });

      setStage("claiming");
      const res = await callSecureEndpoint("claim_credit_purchase", { txHash }, address, signMessage);

      emitCreditsChanged(res.balance);
      toast({
        title: `${res.credits} credits added`,
        description: `Balance is now ${res.balance}.`,
      });
      setOpen(false);
    } catch (err) {
      console.error("Purchase failed:", err);
      const message = (err as { message?: string })?.message ?? "";
      toast({
        title: /rejected|denied|User rejected/i.test(message) ? "Payment cancelled" : "Purchase failed",
        description: /rejected|denied|User rejected/i.test(message)
          ? "Nothing was charged."
          : "If the payment went through, reopen this and use the transaction hash — nothing is lost.",
        variant: "destructive",
      });
    } finally {
      setStage("idle");
    }
  };

  const grantAdmin = async () => {
    if (!address) return;
    try {
      setStage("claiming");
      const res = await callSecureEndpoint("grant_admin_credits", { credits: 500 }, address, signMessage);
      emitCreditsChanged(res.balance);
      toast({ title: `${res.credits} test credits added`, description: `Balance is now ${res.balance}.` });
      setOpen(false);
    } catch {
      toast({ title: "Could not grant credits", variant: "destructive" });
    } finally {
      setStage("idle");
    }
  };

  const busy = stage !== "idle";

  return (
    <>
      <span onClick={() => setOpen(true)}>
        {trigger ?? (
          <Button size="sm" variant="outline">
            <Coins className="mr-1.5 h-3.5 w-3.5" />
            Buy credits
          </Button>
        )}
      </span>

      <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Buy credits</DialogTitle>
            <DialogDescription>
              Paid on {ACTIVE_CHAIN.name} from the wallet you are signed in with.
            </DialogDescription>
          </DialogHeader>

          {loading && (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Pricing at the current ETH rate…
            </div>
          )}

          {quote && !loading && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border/70 bg-white/[0.02] p-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl">{quote.credits} credits</span>
                  <span className="text-l2 text-lg">${(quote.usdCents / 100).toFixed(2)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-mono">{amountEth.toFixed(6)} ETH</span>
                  <span>at ${quote.ethUsd.toLocaleString()} / ETH</span>
                </div>
              </div>

              {wrongChain && (
                <p className="flex items-start gap-2 text-xs text-[hsl(var(--warning))]">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Your wallet is on another network. Paying will ask you to switch
                  to {ACTIVE_CHAIN.name} first.
                </p>
              )}

              <Button className="w-full" onClick={buy} disabled={busy}>
                {stage === "paying" && <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Confirm in your wallet</>}
                {stage === "confirming" && <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Waiting for the chain</>}
                {stage === "claiming" && <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Adding credits</>}
                {stage === "idle" && <>Pay {amountEth.toFixed(6)} ETH</>}
              </Button>

              {quote.isAdmin && (
                <div className="rounded-xl border border-[hsl(var(--verified)/0.25)] bg-[hsl(var(--verified)/0.06)] p-3">
                  <p className="flex items-center gap-1.5 text-xs text-[hsl(var(--verified))]">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Admin wallet
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Grant credits without paying, for testing against the live system.
                    Recorded in the ledger as a grant, not a purchase.
                  </p>
                  <Button size="sm" variant="outline" className="mt-3 w-full" onClick={grantAdmin} disabled={busy}>
                    Add 500 test credits
                  </Button>
                </div>
              )}

              <a
                href={`${ACTIVE_CHAIN.explorerUrl}/address/${quote.contract}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground underline underline-offset-4"
              >
                Inspect the payment contract
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
