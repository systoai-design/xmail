import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Wallet } from 'lucide-react';

export const WalletButton = () => {
  const { publicKey } = useWallet();

  return (
    <div className="wallet-button-container">
      <WalletMultiButton className="!bg-primary hover:!bg-primary/90 !h-12 !px-6 !text-lg !font-bold !rounded-xl transition-all hover:scale-105 shadow-glow" />
      {publicKey && (
        <div className="mt-2 text-sm text-muted-foreground flex items-center gap-2">
          <Wallet className="w-4 h-4" />
          <span className="font-mono">{publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}</span>
        </div>
      )}
    </div>
  );
};
