import { WalletButton } from '@/components/WalletButton';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';

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
    <section ref={sectionRef} className="relative bg-background py-16 sm:py-20 md:py-24 px-4 sm:px-6 overflow-hidden">
      {/* Massive gradient background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 gradient-hero" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] sm:w-[600px] md:w-[800px] h-[400px] sm:h-[600px] md:h-[800px] bg-primary/20 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-5xl mx-auto text-center relative z-10">
        <div className={`space-y-8 sm:space-y-12 fade-in-up ${isVisible ? 'visible' : ''}`}>
          {/* Headline */}
          <h2 className="text-4xl sm:text-6xl md:text-8xl font-black leading-tight px-4">
            Ready to send
            <br />
            <span className="gradient-primary bg-clip-text text-transparent">
              encrypted messages?
            </span>
          </h2>

          {/* Subtext */}
          <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto px-4">
            Connect your wallet and start messaging with true privacy
          </p>

          {/* CTA Button */}
          <div className="pt-4 sm:pt-8">
            <div className="inline-block relative group">
              <div className="absolute -inset-4 sm:-inset-6 bg-gradient-to-r from-primary via-secondary to-primary opacity-30 blur-3xl group-hover:opacity-50 transition-smooth rounded-full" />
              <div className="relative">
                <WalletButton />
              </div>
            </div>
          </div>

          {/* Additional info */}
          <div className="pt-8 sm:pt-12 flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs sm:text-sm text-muted-foreground px-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-accent" />
              <span>No email required</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-secondary" />
              <span>Gasless transactions</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-primary" />
              <span>100% encrypted</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
