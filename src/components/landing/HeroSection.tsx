import { useEffect, useState } from 'react';
import { WalletButton } from '@/components/WalletButton';
import { Shield, Lock, Zap, Eye } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { EncryptionAnimation } from './EncryptionAnimation';

export const HeroSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    setIsMobile(window.innerWidth < 768);
  }, []);

  const scrollToNext = () => {
    const nextSection = document.getElementById('how-it-works');
    nextSection?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="gradient-hero min-h-screen flex items-center justify-center px-4 sm:px-6 pt-40 pb-32 sm:pt-48 sm:pb-40 relative overflow-hidden">
      {/* Security Grid Background */}
      <div className="absolute inset-0 security-grid opacity-50" />
      
      {/* Noise Texture */}
      <div className="absolute inset-0 noise-overlay" />
      
      {/* Data Flow Particles */}
      <div className="data-particles" />
      
      {/* Encryption Animation */}
      <EncryptionAnimation />

      {/* Main Content */}
      <div className={`max-w-6xl mx-auto text-center space-y-12 sm:space-y-16 relative z-10 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        
        {/* Protocol Badge - Larger & More Prominent */}
        <div className="inline-flex items-center gap-3 glass-card px-8 py-4 rounded-full border border-primary/30 animate-encrypt-reveal shadow-[0_0_30px_rgba(74,158,255,0.2)]">
          <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-primary animate-lock-pulse" />
          <span className="text-sm sm:text-base font-bold tracking-wider bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent animate-gradient">
            SOLANA X402 PROTOCOL
          </span>
        </div>

        {/* Main Headline - Premium Typography */}
        <h1 className="font-black leading-[1.05] tracking-tight px-4">
          <span className="block mb-4 text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-muted-foreground font-semibold animate-encrypt-reveal" style={{ animationDelay: '0.1s' }}>
            The most secure way to
          </span>
          <span className="block mb-4 text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-foreground animate-encrypt-reveal drop-shadow-[0_0_40px_rgba(255,255,255,0.15)]" style={{ animationDelay: '0.2s' }}>
            send encrypted messages
          </span>
          <span className="block text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-muted-foreground/80 font-semibold font-mono animate-encrypt-reveal" style={{ animationDelay: '0.3s' }}>
            wallet to wallet
          </span>
        </h1>

        {/* Feature Pills - Larger & More Spacious */}
        <TooltipProvider delayDuration={200}>
          <div className="flex flex-wrap items-center justify-center gap-5 sm:gap-6 animate-encrypt-reveal" style={{ animationDelay: '0.4s' }}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="inline-flex items-center gap-3 glass-card px-6 py-3.5 rounded-xl border border-primary/30 hover:border-primary/50 transition-all cursor-hover hover:scale-105 shadow-[0_0_20px_rgba(74,158,255,0.1)] hover:shadow-[0_0_30px_rgba(74,158,255,0.2)]">
                  <Lock className="w-5 h-5 text-primary" />
                  <span className="text-sm sm:text-base font-semibold">End-to-End Encrypted</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="glass-card border-primary/30 max-w-sm">
                <p className="text-sm">Military-grade AES-256-GCM encryption ensures only you and your recipient can read messages</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="inline-flex items-center gap-3 glass-card px-6 py-3.5 rounded-xl border border-secondary/30 hover:border-secondary/50 transition-all cursor-hover hover:scale-105 shadow-[0_0_20px_rgba(0,212,255,0.1)] hover:shadow-[0_0_30px_rgba(0,212,255,0.2)]">
                  <Zap className="w-5 h-5 text-secondary" />
                  <span className="text-sm sm:text-base font-semibold">Gasless Payments</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="glass-card border-secondary/30 max-w-sm">
                <p className="text-sm">Send micropayments with every message. Recipients pay only $0.0001 to read</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="inline-flex items-center gap-3 glass-card px-6 py-3.5 rounded-xl border border-accent/30 hover:border-accent/50 transition-all cursor-hover hover:scale-105 shadow-[0_0_20px_rgba(139,92,246,0.1)] hover:shadow-[0_0_30px_rgba(139,92,246,0.2)]">
                  <Eye className="w-5 h-5 text-accent" />
                  <span className="text-sm sm:text-base font-semibold">Zero Knowledge</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="glass-card border-accent/30 max-w-sm">
                <p className="text-sm">Your privacy is absolute. Not even servers can access your encrypted communications</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>

        {/* Tagline - More Prominent */}
        <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground/90 max-w-4xl mx-auto leading-relaxed animate-encrypt-reveal font-medium" style={{ animationDelay: '0.5s' }}>
          No email servers. No intermediaries. Just pure, encrypted communication directly between Solana wallets. 
          <span className="block mt-3 text-primary font-bold text-xl sm:text-2xl">Your data. Your control. Your privacy.</span>
        </p>

        {/* CTA Button - Larger & More Dramatic */}
        <div className="flex flex-col items-center gap-6 animate-encrypt-reveal pt-4" style={{ animationDelay: '0.6s' }}>
          <div className="relative group">
            {/* Premium animated border */}
            <div className="absolute -inset-2 bg-gradient-to-r from-primary via-secondary to-accent rounded-3xl opacity-75 group-hover:opacity-100 blur-xl transition-all duration-500 animate-gradient" />
            <div className="absolute -inset-1 bg-gradient-to-r from-primary via-secondary to-accent rounded-3xl opacity-50 group-hover:opacity-75 transition-all duration-500" />
            <div className="relative">
              <WalletButton variant="full" />
            </div>
          </div>

          {/* Trust indicators - More Prominent */}
          <div className="flex flex-wrap items-center justify-center gap-8 text-sm sm:text-base text-muted-foreground font-medium">
            <div className="flex items-center gap-2.5 glass-card px-5 py-2.5 rounded-lg border border-primary/20">
              <Lock className="w-5 h-5 text-primary" />
              <span className="font-mono font-semibold">256-bit Encryption</span>
            </div>
            <div className="h-6 w-px bg-border/50" />
            <div className="flex items-center gap-2.5 glass-card px-5 py-2.5 rounded-lg border border-secondary/20">
              <Shield className="w-5 h-5 text-secondary" />
              <span className="font-mono font-semibold">$0.0001 per message</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
