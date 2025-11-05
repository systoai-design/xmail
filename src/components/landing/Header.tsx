import { Lock } from 'lucide-react';
import { WalletButton } from '@/components/WalletButton';

export const Header = () => {
  return (
    <header className="fixed top-4 left-0 right-0 z-50 px-6">
      <div className="max-w-7xl mx-auto">
        <nav className="glass-strong rounded-full px-8 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            <span className="text-xl font-black gradient-primary bg-clip-text text-transparent">
              x402Mail
            </span>
          </div>

          {/* Connect Wallet Button */}
          <WalletButton />
        </nav>
      </div>
    </header>
  );
};
