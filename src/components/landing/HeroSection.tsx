import { WalletButton } from '@/components/WalletButton';
import { ChevronDown, Lock, Zap, Shield, Sparkles, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

export const HeroSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    setIsMobile(window.innerWidth < 768);
    
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
    <section className="min-h-screen gradient-hero flex flex-col items-center justify-center relative px-4 sm:px-6 pt-24 sm:pt-32 pb-16 sm:pb-20 overflow-hidden">
      {/* Enhanced animated grid background */}
      <div className="absolute inset-0">
        {/* Mouse-reactive gradient */}
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: `radial-gradient(circle 800px at ${mousePosition.x}px ${mousePosition.y}px, hsl(267 100% 65% / 0.4) 0%, transparent 50%)`,
          transition: 'background-image 0.3s ease-out'
        }} />
        
        {/* Animated grid */}
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'linear-gradient(to right, hsl(267 100% 65% / 0.15) 1px, transparent 1px), linear-gradient(to bottom, hsl(267 100% 65% / 0.15) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
          animation: 'mesh-move 20s ease-in-out infinite'
        }} />

        {/* Gradient overlay */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-primary/10 to-transparent" />
      </div>

      {/* Floating orbs - cleaner, reduced count */}
      <div className="absolute top-20 right-10 sm:right-20 w-48 sm:w-80 h-48 sm:h-80 bg-primary/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-40 left-10 sm:left-20 w-64 sm:w-96 h-64 sm:h-96 bg-secondary/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="hidden lg:block absolute top-1/3 right-1/4 w-64 h-64 bg-accent/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      
      {/* Floating particles - reduced count */}
      {[...Array(isMobile ? 8 : 20)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full animate-float"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            width: `${2 + Math.random() * 4}px`,
            height: `${2 + Math.random() * 4}px`,
            background: i % 3 === 0 ? 'hsl(267 100% 65% / 0.4)' : i % 3 === 1 ? 'hsl(187 100% 43% / 0.4)' : 'hsl(150 100% 50% / 0.4)',
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${5 + Math.random() * 10}s`,
            boxShadow: i % 5 === 0 ? '0 0 20px currentColor' : 'none'
          }}
        />
      ))}

      <div className={`max-w-7xl w-full text-center space-y-8 sm:space-y-12 fade-in-up ${isVisible ? 'visible' : ''} relative z-10`}>
        {/* Refined floating badge */}
        <div className="inline-flex items-center gap-2 glass-card px-4 py-2 sm:px-6 sm:py-3 rounded-full hover:scale-105 transition-all cursor-default">
          <span className="text-xs sm:text-sm font-bold tracking-wider uppercase bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            Solana x402 Protocol
          </span>
        </div>
        
        {/* Main headline - refined sizing */}
        <div className="space-y-2 sm:space-y-4">
          <h1 className="relative">
            <span className="block text-[10vw] sm:text-[8vw] md:text-7xl lg:text-8xl font-extrabold leading-none tracking-tight animate-slide-up">
              encrypted
            </span>
            <span className="block text-[12vw] sm:text-[10vw] md:text-8xl lg:text-9xl font-black leading-none tracking-tight -mt-2 sm:-mt-3 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <span className="gradient-primary bg-clip-text text-transparent animate-gradient">
                messaging
              </span>
            </span>
            <span className="block text-[6vw] sm:text-[5vw] md:text-5xl lg:text-6xl font-extrabold leading-none tracking-tight text-muted-foreground mt-1 sm:mt-2 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              wallet to wallet
            </span>
          </h1>
        </div>

        {/* Feature badges - refined */}
        <TooltipProvider>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 max-w-3xl mx-auto animate-slide-up" style={{ animationDelay: '0.3s' }}>
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
        <div className="max-w-3xl mx-auto animate-slide-up px-4" style={{ animationDelay: '0.4s' }}>
          <p className="text-base sm:text-xl md:text-2xl text-muted-foreground leading-relaxed">
            Send encrypted messages with <span className="text-secondary font-bold">micropayments</span>.
            <br />
            <span className="text-foreground font-black text-lg sm:text-2xl md:text-3xl gradient-primary bg-clip-text text-transparent">
              Only your recipient can decrypt.
            </span>
            <br />
            <span className="text-accent font-semibold text-sm sm:text-base">No intermediaries. True privacy.</span>
          </p>
        </div>

        {/* CTA Button - cleaner glow */}
        <div className="pt-6 animate-slide-up" style={{ animationDelay: '0.5s' }}>
          <div className="inline-block relative group">
            <div className="absolute -inset-8 bg-gradient-to-r from-primary via-secondary to-accent opacity-20 blur-3xl group-hover:opacity-30 transition-all duration-500 rounded-full" />
            <div className="relative transform group-hover:scale-105 transition-all duration-300">
              <WalletButton />
            </div>
          </div>
        </div>

        {/* Trust indicators - reduced to 2 */}
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 pt-6 animate-slide-up" style={{ animationDelay: '0.6s' }}>
          <div className="flex items-center gap-2 sm:gap-3 glass-card px-3 py-1.5 sm:px-4 sm:py-2 rounded-full hover:scale-105 transition-all cursor-default">
            <div className="w-2 h-2 rounded-full bg-accent" />
            <span className="text-xs sm:text-sm font-medium text-muted-foreground">Military-grade encryption</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 glass-card px-3 py-1.5 sm:px-4 sm:py-2 rounded-full hover:scale-105 transition-all cursor-default">
            <div className="w-2 h-2 rounded-full bg-secondary" />
            <span className="text-xs sm:text-sm font-medium text-muted-foreground">~$0.01 per message</span>
          </div>
        </div>
      </div>

    </section>
  );
};
