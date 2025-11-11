import { WalletButton } from '@/components/WalletButton';
import { useEffect, useRef, useState } from 'react';
import { Lock, Shield, Zap } from 'lucide-react';

export const CTASection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="gradient-section relative py-20 sm:py-24 md:py-32 px-4 sm:px-6 overflow-hidden">
      {/* Spotlight Effect */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] sm:w-[700px] h-[500px] sm:h-[700px] bg-primary/20 rounded-full blur-[120px] animate-pulse-glow" />
      </div>
      
      {/* Security Grid */}
      <div className="absolute inset-0 security-grid opacity-10" />

      <div className="max-w-4xl mx-auto text-center relative z-10">
        <div className={`space-y-10 sm:space-y-12 fade-in-up ${isVisible ? 'visible' : ''}`}>
          {/* Security Shield Icon */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl glass-card border-2 border-primary/30 animate-lock-pulse">
            <Shield className="w-10 h-10 text-primary" />
          </div>
          
          {/* Headline */}
          <h2 className="text-4xl sm:text-5xl md:text-7xl font-black leading-tight">
            Ready to send
            <br />
            <span className="gradient-primary bg-clip-text text-transparent">
              encrypted messages?
            </span>
          </h2>

          {/* Subtext */}
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Connect your wallet and start messaging with military-grade encryption and complete privacy
          </p>

          {/* CTA Button with Security Shield */}
          <div className="pt-6">
            <div className="inline-block relative group">
              {/* Animated Security Shield Border */}
              <div className="absolute -inset-8 opacity-30 group-hover:opacity-40 transition-opacity duration-500">
                <div className="absolute inset-0 bg-gradient-to-r from-primary via-secondary to-accent rounded-full blur-2xl animate-pulse-glow" />
              </div>
              
              <div className="relative">
                <WalletButton />
              </div>
            </div>
          </div>

          {/* Trust indicators with enhanced styling */}
          <div className="pt-10 flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2 glass-card px-4 py-2.5 rounded-full border border-border/50 hover:border-accent/40 transition-all hover:scale-105">
              <Shield className="w-4 h-4 text-accent animate-lock-pulse" />
              <span className="text-xs sm:text-sm font-semibold">No email required</span>
            </div>
            <div className="flex items-center gap-2 glass-card px-4 py-2.5 rounded-full border border-border/50 hover:border-secondary/40 transition-all hover:scale-105">
              <Zap className="w-4 h-4 text-secondary animate-lock-pulse" style={{ animationDelay: '0.3s' }} />
              <span className="text-xs sm:text-sm font-semibold">Gasless transactions</span>
            </div>
            <div className="flex items-center gap-2 glass-card px-4 py-2.5 rounded-full border border-border/50 hover:border-primary/40 transition-all hover:scale-105">
              <Lock className="w-4 h-4 text-primary animate-lock-pulse" style={{ animationDelay: '0.6s' }} />
              <span className="text-xs sm:text-sm font-semibold">100% encrypted</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
