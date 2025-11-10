import { WalletButton } from '@/components/WalletButton';
import { Logo } from '@/components/Logo';
import { SocialLinks } from '@/components/SocialLinks';
import { useWallet } from '@solana/wallet-adapter-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export const Header = () => {
  const { connected } = useWallet();
  const navigate = useNavigate();

  return (
    <header className="fixed top-3 sm:top-4 left-0 right-0 z-50 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <nav className="glass-header rounded-[24px] sm:rounded-[35px] px-5 sm:px-6 md:px-8 py-4 sm:py-5 flex items-center justify-between gap-3 sm:gap-4 border-2 border-white/10 min-h-[60px] sm:min-h-[70px]">
          {/* Logo */}
          <Logo size="small" />

          {/* Right side buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            <SocialLinks />
            <div className="h-6 w-px bg-border hidden sm:block" />
            {connected && (
              <Button
                onClick={() => navigate('/inbox')}
                variant="default"
                size="sm"
                className="bg-primary hover:bg-primary/90 text-white font-semibold shadow-md"
              >
                <span className="hidden sm:inline">Launch xmail</span>
                <span className="sm:hidden">Launch</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            )}
            <WalletButton variant="compact" />
          </div>
        </nav>
      </div>
    </header>
  );
};
