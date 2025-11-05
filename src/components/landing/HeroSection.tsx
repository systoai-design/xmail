import { WalletButton } from '@/components/WalletButton';
import { ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';

export const HeroSection = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation on mount
    setIsVisible(true);
  }, []);

  const scrollToNext = () => {
    const nextSection = document.getElementById('how-it-works');
    nextSection?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="min-h-screen gradient-hero flex flex-col items-center justify-center relative px-6">
      <div className={`max-w-6xl w-full text-center space-y-8 fade-in-up ${isVisible ? 'visible' : ''}`}>
        <h1 className="text-8xl md:text-9xl font-black text-foreground leading-tight">
          encrypted messaging
          <br />
          <span className="gradient-primary bg-clip-text text-transparent">
            through immersion
          </span>
        </h1>
        <p className="text-2xl md:text-3xl text-muted-foreground max-w-3xl mx-auto font-medium">
          Wallet-to-wallet encrypted messages powered by Solana's x402 protocol.
          <br />
          Zero intermediaries. True privacy.
        </p>
        <div className="pt-8">
          <WalletButton />
        </div>
      </div>

      {/* Scroll Indicator */}
      <button
        onClick={scrollToNext}
        className="absolute bottom-12 animate-bounce cursor-pointer hover:scale-110 transition-smooth"
        aria-label="Scroll to next section"
      >
        <ChevronDown className="w-12 h-12 text-primary" />
      </button>
    </section>
  );
};
