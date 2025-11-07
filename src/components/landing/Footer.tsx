import { Lock } from 'lucide-react';
import { Logo } from '@/components/Logo';

export const Footer = () => {
  return (
    <footer className="bg-background py-8 sm:py-12 px-4 sm:px-6 border-t border-border">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col items-center space-y-4 sm:space-y-6">
          {/* Logo/Brand */}
          <Logo size="large" />

          {/* Tagline */}
          <p className="text-sm sm:text-base md:text-lg text-muted-foreground flex items-center gap-2 text-center">
            <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
            Powered by Solana x402 Protocol
          </p>

          {/* Copyright */}
          <p className="text-xs sm:text-sm text-muted-foreground text-center">
            © {new Date().getFullYear()} xmail. Built with privacy in mind.
          </p>
        </div>
      </div>
    </footer>
  );
};
