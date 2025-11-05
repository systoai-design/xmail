import { Lock } from 'lucide-react';
import { WalletButton } from '@/components/WalletButton';

export const Header = () => {
  return (
    <header className="fixed top-2 sm:top-4 left-0 right-0 z-50 px-3 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <nav className="glass-ultra rounded-[24px] sm:rounded-[35px] px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            <span className="text-base sm:text-xl font-black gradient-primary bg-clip-text text-transparent">
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
