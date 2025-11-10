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
    <section ref={sectionRef} className="relative bg-background py-20 sm:py-24 md:py-32 px-4 sm:px-6 overflow-hidden">
      {/* Simplified background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] sm:w-[700px] h-[500px] sm:h-[700px] bg-primary/15 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-4xl mx-auto text-center relative z-10">
        <div className={`space-y-10 sm:space-y-12 fade-in-up ${isVisible ? 'visible' : ''}`}>
          {/* Headline - more impactful */}
          <h2 className="text-4xl sm:text-5xl md:text-7xl font-extrabold leading-tight">
            Ready to send
            <br />
            <span className="gradient-primary bg-clip-text text-transparent">
              encrypted messages?
            </span>
          </h2>

          {/* Subtext */}
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            Connect your wallet and start messaging with true privacy
          </p>

          {/* CTA Button - single clean glow with subtle pulse */}
          <div className="pt-6">
            <div className="inline-block relative group">
              <div className="absolute -inset-6 bg-gradient-to-r from-primary to-secondary opacity-20 blur-2xl group-hover:opacity-30 transition-all duration-500 rounded-full animate-pulse-glow" />
              <div className="relative">
                <WalletButton />
              </div>
            </div>
          </div>

          {/* Trust indicators - with icons */}
          <div className="pt-10 flex flex-wrap items-center justify-center gap-6 sm:gap-8">
            <div className="flex items-center gap-2 glass-card px-4 py-2 rounded-full">
              <Shield className="w-3.5 h-3.5 text-accent" />
              <span className="text-xs sm:text-sm font-medium">No email required</span>
            </div>
            <div className="flex items-center gap-2 glass-card px-4 py-2 rounded-full">
              <Zap className="w-3.5 h-3.5 text-secondary" />
              <span className="text-xs sm:text-sm font-medium">Gasless transactions</span>
            </div>
            <div className="flex items-center gap-2 glass-card px-4 py-2 rounded-full">
              <Lock className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs sm:text-sm font-medium">100% encrypted</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
