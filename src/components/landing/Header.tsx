import { WalletButton } from '@/components/WalletButton';
import { Logo } from '@/components/Logo';

export const Header = () => {
  return (
    <header className="fixed top-2 sm:top-4 left-0 right-0 z-50 px-3 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <nav className="glass-ultra rounded-[24px] sm:rounded-[35px] px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between">
          {/* Logo */}
          <Logo size="small" />

          {/* Connect Wallet Button */}
          <WalletButton />
        </nav>
      </div>
    </header>
  );
};
