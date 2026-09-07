import { useEffect, useState } from "react";
import { useConnect } from "wagmi";
import { Wallet, ShieldCheck, ShieldAlert, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useEncryptionKeys } from "@/hooks/useEncryptionKeys";
import { useWallet } from "@/hooks/useWallet";
import { onOpenConnect } from "@/lib/events";

/**
 * Connect.
 *
 * `injected()` reports every EIP-6963 wallet the browser actually has, so the
 * list is what is installed rather than a hardcoded roster that goes stale.
 * MetaMask, Rabby, Brave and Frame all show up on their own.
 */
interface WalletButtonProps {
  variant?: "full" | "compact";
}

export const WalletButton = ({ variant = "full" }: WalletButtonProps) => {
  const { address, connected, connecting, wrongChain, switchToChain } = useWallet();
  const { keysReady } = useEncryptionKeys();
  const { connectors, connect, isPending, error } = useConnect();
  const [open, setOpen] = useState(false);

  // Landing CTAs open this dialog without needing a reference to it.
  useEffect(() => onOpenConnect(() => setOpen(true)), []);

  // De-duplicated: some browsers surface the same wallet under two providers.
  const available = connectors.filter(
    (c, i, all) => all.findIndex((x) => x.name === c.name) === i,
  );

  if (connected && address) {
    return (
      <div className="flex flex-col items-start gap-2">
        {wrongChain && (
          <Button variant="outline" size="sm" onClick={() => void switchToChain()}>
            <AlertTriangle className="mr-2 h-4 w-4 text-[hsl(var(--warning))]" />
            Switch to Robinhood Chain
          </Button>
        )}
        {variant === "full" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Wallet className="h-4 w-4" />
            <span className="font-mono">
              {address.slice(0, 6)}…{address.slice(-4)}
            </span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  {keysReady ? (
                    <ShieldCheck className="h-4 w-4 text-[hsl(var(--verified))]" />
                  ) : (
                    <ShieldAlert className="h-4 w-4 text-[hsl(var(--warning))]" />
                  )}
                </TooltipTrigger>
                <TooltipContent>
                  {keysReady ? "Encryption ready" : "Setting up encryption"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={connecting} className="h-12 px-6">
        {connecting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Connecting
          </>
        ) : (
          <>
            <Wallet className="mr-2 h-4 w-4" />
            Connect wallet
          </>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Connect a wallet</DialogTitle>
            <DialogDescription>
              Your wallet address is your mail address. xmail never asks for a
              name, an email, or a password.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 flex flex-col gap-2">
            {available.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No wallet detected. Install MetaMask, Rabby, or another Ethereum
                wallet, then reload this page.
              </p>
            )}
            {available.map((connector) => (
              <Button
                key={connector.uid}
                variant="outline"
                className="justify-start"
                disabled={isPending}
                onClick={() => {
                  connect({ connector });
                  setOpen(false);
                }}
              >
                <Wallet className="mr-2 h-4 w-4" />
                {connector.name}
              </Button>
            ))}
          </div>

          {error && (
            <p className="mt-3 text-xs text-destructive">{error.message}</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
