import { WalletButton } from '@/components/WalletButton';
import { ChevronDown, Lock, Zap, Shield, Sparkles, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { EncryptionAnimation } from '@/components/landing/EncryptionAnimation';

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
    <section className="min-h-screen gradient-hero flex flex-col items-center justify-center relative px-4 sm:px-6 pt-24 sm:pt-32 md:pt-40 pb-12 sm:pb-20 md:pb-24 overflow-hidden">

      {/* Encryption Animation */}
      <EncryptionAnimation />

      <div className={`max-w-7xl w-full text-center space-y-4 sm:space-y-6 md:space-y-8 fade-in-up ${isVisible ? 'visible' : ''} relative z-10 px-4 sm:px-6`}>
        {/* Refined floating badge */}
        <div className="inline-flex items-center gap-2 glass-card px-4 py-2 sm:px-6 sm:py-3 rounded-full hover:scale-105 transition-all cursor-default mb-3 sm:mb-6">
          <span className="text-xs sm:text-sm font-bold tracking-wider uppercase bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            Solana x402 Protocol
          </span>
        </div>
        
        {/* Main headline - refined sizing */}
        <div className="space-y-2 sm:space-y-3 md:space-y-4">
          <h1 className="relative">
            <span className="block text-[11vw] sm:text-[8vw] md:text-7xl lg:text-8xl font-extrabold leading-tight tracking-tight animate-slide-up">
              encrypted
            </span>
            <span className="block text-[13vw] sm:text-[10vw] md:text-8xl lg:text-9xl font-black leading-tight tracking-tight mt-1 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <span className="gradient-primary bg-clip-text text-transparent animate-gradient">
                messaging
              </span>
            </span>
            <span className="block text-[7vw] sm:text-[5vw] md:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight text-muted-foreground mt-2 sm:mt-4 md:mt-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              wallet to wallet
            </span>
          </h1>
        </div>

        {/* Feature badges - refined */}
        <TooltipProvider>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 md:gap-4 max-w-3xl mx-auto animate-slide-up my-4 sm:my-6 md:my-8" style={{ animationDelay: '0.3s' }}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 glass-card px-3 py-2 sm:px-4 sm:py-2.5 rounded-full hover:scale-105 hover-glow-subtle transition-all cursor-default group">
                  <div className="p-1 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-all">
                    <Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary" />
                  </div>
                  <span className="text-xs sm:text-sm font-semibold">End-to-End Encrypted</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-semibold">Only you and recipient can read</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 glass-card px-3 py-2 sm:px-4 sm:py-2.5 rounded-full hover:scale-105 hover-glow-subtle transition-all cursor-default group">
                  <div className="p-1 rounded-full bg-secondary/10 group-hover:bg-secondary/20 transition-all">
                    <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-secondary" />
                  </div>
                  <span className="text-xs sm:text-sm font-semibold">Gasless Payments</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-semibold">No transaction fees for you</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 glass-card px-3 py-2 sm:px-4 sm:py-2.5 rounded-full hover:scale-105 hover-glow-subtle transition-all cursor-default group">
                  <div className="p-1 rounded-full bg-accent/10 group-hover:bg-accent/20 transition-all">
                    <Shield className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-accent" />
                  </div>
                  <span className="text-xs sm:text-sm font-semibold">Zero Knowledge</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-semibold">We never see your messages</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>

        {/* Enhanced tagline with better typography */}
        <div className="max-w-3xl mx-auto animate-slide-up px-4 mt-4 sm:mt-6" style={{ animationDelay: '0.4s' }}>
          <p className="text-sm sm:text-lg md:text-xl text-muted-foreground leading-relaxed space-y-1.5 sm:space-y-2">
            <span className="block">
              Send encrypted messages with <span className="text-secondary font-bold">micropayments</span>.
            </span>
            <span className="block text-foreground font-black text-base sm:text-xl md:text-2xl gradient-primary bg-clip-text text-transparent mt-2 sm:mt-3">
              Only your recipient can decrypt.
            </span>
            <span className="block text-accent font-semibold text-xs sm:text-sm md:text-base mt-1.5 sm:mt-2">
              No intermediaries. True privacy.
            </span>
          </p>
        </div>

        {/* CTA Button - cleaner glow */}
        <div className="pt-6 sm:pt-8 md:pt-10 animate-slide-up" style={{ animationDelay: '0.5s' }}>
          <div className="inline-block relative group">
            <div className="absolute -inset-6 bg-gradient-to-r from-primary via-secondary to-accent opacity-15 blur-2xl group-hover:opacity-25 transition-all duration-500 rounded-full" />
            <div className="relative transform group-hover:scale-105 transition-all duration-300">
              <WalletButton />
            </div>
          </div>
        </div>

        {/* Trust indicators - reduced to 2 */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 md:gap-6 pt-6 sm:pt-8 md:pt-10 pb-16 md:pb-24 animate-slide-up" style={{ animationDelay: '0.6s' }}>
          <div className="flex items-center gap-2.5 sm:gap-3 glass-card px-4 py-2 sm:px-5 sm:py-2.5 rounded-full hover:scale-105 transition-all cursor-default">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="text-xs sm:text-sm font-medium text-muted-foreground">Military-grade encryption</span>
          </div>
          <div className="flex items-center gap-2.5 sm:gap-3 glass-card px-4 py-2 sm:px-5 sm:py-2.5 rounded-full hover:scale-105 transition-all cursor-default">
            <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" style={{ animationDelay: '0.5s' }} />
            <span className="text-xs sm:text-sm font-medium text-muted-foreground">~$0.01 per message</span>
          </div>
        </div>
      </div>

    </section>
  );
};
