import { Lock } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-background py-12 px-6 border-t border-border">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col items-center space-y-6">
          {/* Logo/Brand */}
          <h3 className="text-4xl font-black gradient-primary bg-clip-text text-transparent">
            x402Mail
          </h3>

          {/* Tagline */}
          <p className="text-lg text-muted-foreground flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Powered by Solana x402 Protocol
          </p>

          {/* Copyright */}
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} x402Mail. Built with privacy in mind.
          </p>
        </div>
      </div>
    </footer>
  );
};
