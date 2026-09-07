
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
import { openConnect } from "@/lib/events";

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
    <Button onClick={openConnect} disabled={connecting} className="h-12 px-6">
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
  );
};
