import { useEffect, useState } from "react";
import { useConnect } from "wagmi";
import { Wallet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { onOpenConnect } from "@/lib/events";
import { ACTIVE_CHAIN } from "@/config/chain";

/**
 * The connect dialog, mounted once at the app root.
 *
 * It used to live inside WalletButton, which is rendered nowhere -- so every
 * "Get started" and "Connect wallet" on the landing page dispatched an event
 * that nothing was listening for, and clicking them did literally nothing. A
 * dialog that any CTA can open has to outlive whichever component opened it.
 *
 * `injected()` reports the wallets the browser actually has via EIP-6963, so
 * this list is what is installed rather than a hardcoded roster that goes
 * stale as wallets come and go.
 */
export function ConnectDialog() {
  const { connectors, connect, isPending, error } = useConnect();
  const [open, setOpen] = useState(false);

  useEffect(() => onOpenConnect(() => setOpen(true)), []);

  // Some browsers surface the same wallet under two providers.
  const available = connectors.filter(
    (c, i, all) => all.findIndex((x) => x.name === c.name) === i,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Connect a wallet</DialogTitle>
          <DialogDescription>
            Your wallet address is your mail address. xmail never asks for a
            name, an email address, or a password.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 flex flex-col gap-2">
          {available.length === 0 ? (
            <p className="text-sm leading-relaxed text-muted-foreground">
              No wallet detected in this browser. Install MetaMask, Rabby, or
              another Ethereum wallet and reload the page.
            </p>
          ) : (
            available.map((connector) => (
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
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Wallet className="mr-2 h-4 w-4" />
                )}
                {connector.name}
              </Button>
            ))
          )}
        </div>

        <p className="mt-1 text-xs text-muted-foreground">
          Runs on {ACTIVE_CHAIN.name}. Your wallet will be asked to switch
          networks if it is on another one.
        </p>

        {error && <p className="mt-2 text-xs text-destructive">{error.message}</p>}
      </DialogContent>
    </Dialog>
  );
}
