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
    <section className="gradient-hero min-h-screen flex items-center justify-center px-4 sm:px-6 pt-28 pb-16 sm:pt-32 sm:pb-20 relative overflow-hidden">
      {/* Security Grid Background */}
      <div className="absolute inset-0 security-grid opacity-40" />
      
      {/* Data Flow Particles */}
      <div className="data-particles" />
      
      {/* Encryption Animation */}
      <EncryptionAnimation />

      {/* Main Content */}
      <div className={`max-w-5xl mx-auto text-center space-y-8 sm:space-y-10 relative z-10 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        
        {/* Protocol Badge */}
        <div className="inline-flex items-center gap-2 glass-card px-5 py-2.5 rounded-full border border-primary/20 animate-encrypt-reveal">
          <Shield className="w-4 h-4 text-primary animate-lock-pulse" />
          <span className="text-xs sm:text-sm font-bold tracking-wider bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent animate-gradient">
            SOLANA X402 PROTOCOL
          </span>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-[1.1] tracking-tight">
          <span className="block mb-2 sm:mb-3 text-foreground animate-encrypt-reveal" style={{ animationDelay: '0.1s' }}>
            The most secure way to
          </span>
          <span className="block gradient-primary bg-clip-text text-transparent animate-encrypt-reveal" style={{ animationDelay: '0.2s' }}>
            send encrypted messages
          </span>
          <span className="block text-foreground/90 animate-encrypt-reveal" style={{ animationDelay: '0.3s' }}>
            wallet to wallet
          </span>
        </h1>

        {/* Feature Pills */}
        <TooltipProvider delayDuration={200}>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 animate-encrypt-reveal" style={{ animationDelay: '0.4s' }}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="inline-flex items-center gap-2 glass-card px-4 py-2.5 rounded-xl border border-primary/20 hover:border-primary/40 transition-all cursor-help hover:scale-105">
                  <Lock className="w-4 h-4 text-primary" />
                  <span className="text-xs sm:text-sm font-semibold">End-to-End Encrypted</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="glass-card border-primary/30">
                <p className="text-xs max-w-xs">Military-grade AES-256-GCM encryption ensures only you and your recipient can read messages</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="inline-flex items-center gap-2 glass-card px-4 py-2.5 rounded-xl border border-secondary/20 hover:border-secondary/40 transition-all cursor-help hover:scale-105">
                  <Zap className="w-4 h-4 text-secondary" />
                  <span className="text-xs sm:text-sm font-semibold">Gasless Payments</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="glass-card border-secondary/30">
                <p className="text-xs max-w-xs">Send micropayments with every message. Recipients pay only $0.0001 to read</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="inline-flex items-center gap-2 glass-card px-4 py-2.5 rounded-xl border border-accent/20 hover:border-accent/40 transition-all cursor-help hover:scale-105">
                  <Eye className="w-4 h-4 text-accent" />
                  <span className="text-xs sm:text-sm font-semibold">Zero Knowledge</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="glass-card border-accent/30">
                <p className="text-xs max-w-xs">No email required. Your identity and data remain completely private on the blockchain</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>

        {/* Tagline */}
        <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed animate-encrypt-reveal" style={{ animationDelay: '0.5s' }}>
          Secure messaging powered by Solana. Micropayments built-in. Complete privacy guaranteed.
        </p>

        {/* CTA with animated border */}
        <div className="relative inline-block animate-encrypt-reveal" style={{ animationDelay: '0.6s' }}>
          <div className="absolute -inset-1 bg-gradient-to-r from-primary via-secondary to-accent rounded-[2.5rem] blur-lg opacity-30 animate-pulse-glow" />
          <div className="relative">
            <WalletButton />
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-xs sm:text-sm text-muted-foreground pt-4 animate-encrypt-reveal" style={{ animationDelay: '0.7s' }}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent animate-lock-pulse" />
            <span className="font-medium">Military-grade encryption</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-secondary animate-lock-pulse" style={{ animationDelay: '0.5s' }} />
            <span className="font-medium">$0.0001 per message</span>
          </div>
        </div>
      </div>
    </section>
  );
};
