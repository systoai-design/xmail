import { WalletButton } from '@/components/WalletButton';
import { Logo } from '@/components/Logo';
import { SocialLinks } from '@/components/SocialLinks';
import { useWallet } from '@solana/wallet-adapter-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Presentation, FileText } from 'lucide-react';

export const Header = () => {
  const { connected } = useWallet();
  const navigate = useNavigate();

  return (
    <header className="fixed top-3 sm:top-4 left-0 right-0 z-50 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <nav className="glass-header rounded-[24px] sm:rounded-[35px] px-5 sm:px-6 md:px-8 py-4 sm:py-5 flex items-center justify-between gap-3 sm:gap-4 min-h-[60px] sm:min-h-[70px]">
          {/* Logo */}
          <Logo size="small" />

          {/* Right side buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Resource Links */}
            <a
              href="https://www.canva.com/design/DAG8zmU9Cdk/gxXLOx31mM-Z3tg46MjstA/view?utm_content=DAG8zmU9Cdk&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=h42eb789122"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <Presentation className="w-4 h-4" />
                <span className="hidden sm:inline ml-1">Pitch Deck</span>
              </Button>
            </a>
            <a
              href="https://docs.google.com/document/d/1jTHDPLTCpJcOkgKAGNFAG11sPzA5TLXbT5XFyEVp_wk/edit?usp=sharing"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline ml-1">Docs</span>
              </Button>
            </a>
            <div className="h-5 w-px bg-border/30 hidden sm:block" />
            <SocialLinks />
            {connected && (
              <Button
                onClick={() => navigate('/inbox')}
                variant="default"
                size="sm"
                className="bg-primary hover:bg-primary/90 text-white font-semibold shadow-glow"
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
