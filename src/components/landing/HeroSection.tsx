import { WalletButton } from '@/components/WalletButton';
import { ChevronDown, Lock, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';

export const HeroSection = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const scrollToNext = () => {
    const nextSection = document.getElementById('how-it-works');
    nextSection?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="min-h-screen gradient-hero flex flex-col items-center justify-center relative px-6 overflow-hidden">
      {/* Floating decorative elements */}
      <div className="absolute top-20 right-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-40 left-20 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      
      <div className={`max-w-7xl w-full text-center space-y-12 fade-in-up ${isVisible ? 'visible' : ''} relative z-10`}>
        {/* Main headline with creative typography */}
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-4 mb-6">
            <Lock className="w-12 h-12 text-primary" />
            <span className="text-lg uppercase tracking-[0.3em] text-primary font-bold">x402 Protocol</span>
            <Zap className="w-12 h-12 text-secondary" />
          </div>
          
          <h1 className="relative">
            <span className="block text-[12vw] md:text-[8rem] font-black leading-none tracking-tighter">
              <span className="text-foreground">encrypted</span>
            </span>
            <span className="block text-[14vw] md:text-[10rem] font-black leading-none tracking-tighter -mt-4">
              <span className="gradient-primary bg-clip-text text-transparent">messaging</span>
            </span>
            <span className="block text-[8vw] md:text-[5rem] font-black leading-none tracking-tight text-muted-foreground mt-4">
              wallet to wallet
            </span>
          </h1>
        </div>

        {/* Tagline with creative layout */}
        <div className="max-w-4xl mx-auto">
          <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed">
            Send encrypted messages with micropayments.
            <br />
            <span className="text-foreground font-bold">Only your recipient can decrypt.</span>
            <br />
            No intermediaries. True privacy.
          </p>
        </div>

        {/* CTA with visual interest */}
        <div className="pt-8">
          <div className="inline-block relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-primary to-secondary opacity-20 blur-2xl rounded-full" />
            <WalletButton />
          </div>
        </div>

        {/* Feature badges */}
        <div className="flex flex-wrap items-center justify-center gap-6 pt-8">
          <div className="glass px-6 py-3 rounded-full">
            <span className="text-sm font-bold text-primary">End-to-End Encrypted</span>
          </div>
          <div className="glass px-6 py-3 rounded-full">
            <span className="text-sm font-bold text-secondary">Gasless Payments</span>
          </div>
          <div className="glass px-6 py-3 rounded-full">
            <span className="text-sm font-bold text-accent">Zero Knowledge</span>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <button
        onClick={scrollToNext}
        className="absolute bottom-12 animate-bounce cursor-pointer hover:scale-110 transition-smooth z-10"
        aria-label="Scroll to next section"
      >
        <ChevronDown className="w-12 h-12 text-primary" />
      </button>
    </section>
  );
};
