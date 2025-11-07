import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Wallet, ShieldCheck, ShieldAlert } from 'lucide-react';
import { useEncryptionKeys } from '@/hooks/useEncryptionKeys';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export const WalletButton = () => {
  const { publicKey } = useWallet();
  const { keysReady } = useEncryptionKeys();

  return (
    <div className="wallet-button-container">
      <WalletMultiButton className="!bg-primary hover:!bg-primary/90 !h-12 !px-6 !text-lg !font-bold !rounded-xl transition-all hover:scale-105 shadow-glow" />
      {publicKey && (
        <div className="mt-2 text-sm text-muted-foreground flex items-center gap-2">
          <Wallet className="w-4 h-4" />
          <span className="font-mono">{publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                {keysReady ? (
                  <ShieldCheck className="w-4 h-4 text-green-500" />
                ) : (
                  <ShieldAlert className="w-4 h-4 text-yellow-500 animate-pulse" />
                )}
              </TooltipTrigger>
              <TooltipContent>
                {keysReady ? 'Encryption Ready' : 'Setting up encryption...'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
    </div>
  );
};
