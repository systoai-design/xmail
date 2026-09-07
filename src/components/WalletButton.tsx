import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Wallet, ShieldCheck, ShieldAlert } from 'lucide-react';
import { useEncryptionKeys } from '@/hooks/useEncryptionKeys';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface WalletButtonProps {
  variant?: 'full' | 'compact';
}

export const WalletButton = ({ variant = 'full' }: WalletButtonProps) => {
  const { publicKey } = useWallet();
  const { keysReady } = useEncryptionKeys();

  return (
    <div className="wallet-button-container">
      {/* No magnetic wrapper and no glow: hover changes colour, nothing moves. */}
      <WalletMultiButton className="!h-12 !rounded-xl !bg-primary !px-6 !text-base hover:!bg-primary/90" />
      {publicKey && variant === 'full' && (
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
