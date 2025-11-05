import { WalletButton } from '@/components/WalletButton';
import { ChevronDown, Lock, Zap, Shield, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';

export const HeroSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setIsVisible(true);
    
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const scrollToNext = () => {
    const nextSection = document.getElementById('how-it-works');
    nextSection?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="min-h-screen gradient-hero flex flex-col items-center justify-center relative px-6 overflow-hidden">
      {/* Animated grid background */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at ${mousePosition.x}px ${mousePosition.y}px, hsl(267 100% 65% / 0.3) 0%, transparent 50%)`,
          transition: 'background-image 0.3s ease-out'
        }} />
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(to right, hsl(267 100% 65% / 0.1) 1px, transparent 1px), linear-gradient(to bottom, hsl(267 100% 65% / 0.1) 1px, transparent 1px)',
          backgroundSize: '80px 80px'
        }} />
      </div>

      {/* Floating orbs with animation */}
      <div className="absolute top-20 right-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-40 left-20 w-[500px] h-[500px] bg-secondary/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      
      {/* Floating particles */}
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 bg-primary/30 rounded-full animate-float"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${5 + Math.random() * 10}s`
          }}
        />
      ))}

      <div className={`max-w-7xl w-full text-center space-y-12 fade-in-up ${isVisible ? 'visible' : ''} relative z-10`}>
        {/* Floating badge */}
        <div className="inline-flex items-center gap-3 glass px-6 py-3 rounded-full mb-8 animate-bounce-slow">
          <Sparkles className="w-5 h-5 text-accent" />
          <span className="text-sm font-bold tracking-wider uppercase">Solana x402 Protocol</span>
          <Sparkles className="w-5 h-5 text-accent" />
        </div>
        
        {/* Main headline with staggered animation */}
        <div className="space-y-6">
          <h1 className="relative">
            <span className="block text-[min(15vw,8rem)] font-black leading-none tracking-tighter animate-slide-up">
              <span className="inline-block hover:scale-110 transition-transform cursor-default">encrypted</span>
            </span>
            <span className="block text-[min(18vw,11rem)] font-black leading-none tracking-tighter -mt-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <span className="gradient-primary bg-clip-text text-transparent inline-block hover:scale-110 transition-transform cursor-default">messaging</span>
            </span>
            <span className="block text-[min(10vw,5rem)] font-black leading-none tracking-tight text-muted-foreground mt-2 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <span className="inline-block hover:text-foreground transition-colors cursor-default">wallet to wallet</span>
            </span>
          </h1>
        </div>

        {/* Feature highlights with icons */}
        <div className="flex flex-wrap items-center justify-center gap-4 max-w-3xl mx-auto animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center gap-2 glass px-4 py-2 rounded-full hover:scale-105 transition-transform cursor-default">
            <Lock className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">End-to-End Encrypted</span>
          </div>
          <div className="flex items-center gap-2 glass px-4 py-2 rounded-full hover:scale-105 transition-transform cursor-default">
            <Zap className="w-4 h-4 text-secondary" />
            <span className="text-sm font-semibold">Gasless Payments</span>
          </div>
          <div className="flex items-center gap-2 glass px-4 py-2 rounded-full hover:scale-105 transition-transform cursor-default">
            <Shield className="w-4 h-4 text-accent" />
            <span className="text-sm font-semibold">Zero Knowledge</span>
          </div>
        </div>

        {/* Tagline */}
        <div className="max-w-3xl mx-auto animate-slide-up" style={{ animationDelay: '0.4s' }}>
          <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed">
            Send encrypted messages with micropayments.
            <br />
            <span className="text-foreground font-bold">Only your recipient can decrypt.</span>
            <br />
            No intermediaries. True privacy.
          </p>
        </div>

        {/* CTA Button */}
        <div className="pt-8 animate-slide-up" style={{ animationDelay: '0.5s' }}>
          <div className="inline-block relative group">
            <div className="absolute -inset-8 bg-gradient-to-r from-primary via-secondary to-accent opacity-30 blur-3xl group-hover:opacity-60 transition-all duration-500 rounded-full animate-pulse" />
            <div className="relative transform group-hover:scale-105 transition-transform">
              <WalletButton />
            </div>
          </div>
        </div>

        {/* Trust indicators */}
        <div className="flex flex-wrap items-center justify-center gap-8 pt-8 text-sm text-muted-foreground animate-slide-up" style={{ animationDelay: '0.6s' }}>
          <div className="flex items-center gap-2 hover:text-foreground transition-colors cursor-default">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span>Military-grade encryption</span>
          </div>
          <div className="flex items-center gap-2 hover:text-foreground transition-colors cursor-default">
            <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" style={{ animationDelay: '0.5s' }} />
            <span>~$0.01 per message</span>
          </div>
          <div className="flex items-center gap-2 hover:text-foreground transition-colors cursor-default">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: '1s' }} />
            <span>No accounts needed</span>
          </div>
        </div>
      </div>

      {/* Scroll Indicator - Enhanced */}
      <button
        onClick={scrollToNext}
        className="absolute bottom-12 z-10 group cursor-pointer"
        aria-label="Scroll to next section"
      >
        <div className="flex flex-col items-center gap-2 animate-bounce">
          <span className="text-xs uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">Scroll</span>
          <ChevronDown className="w-8 h-8 text-primary group-hover:scale-125 transition-transform" />
        </div>
      </button>
    </section>
  );
};
