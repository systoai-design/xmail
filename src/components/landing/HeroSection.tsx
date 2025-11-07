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

      {/* Enhanced floating orbs - reduced on mobile */}
      <div className="absolute top-20 right-10 sm:right-20 w-48 sm:w-96 h-48 sm:h-96 bg-primary/30 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-40 left-10 sm:left-20 w-64 sm:w-[500px] h-64 sm:h-[500px] bg-secondary/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="hidden sm:block absolute top-1/2 left-1/2 w-64 h-64 bg-accent/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      <div className="hidden sm:block absolute top-40 left-1/3 w-80 h-80 bg-primary/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
      
      {/* Enhanced floating particles - fewer on mobile */}
      {[...Array(isMobile ? 10 : 30)].map((_, i) => (
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

      <div className={`max-w-7xl w-full text-center space-y-6 sm:space-y-12 fade-in-up ${isVisible ? 'visible' : ''} relative z-10`}>
        {/* Enhanced floating badge with glow */}
        <div className="inline-flex items-center gap-2 sm:gap-3 glass-glow px-4 py-2 sm:px-8 sm:py-4 rounded-[24px] sm:rounded-[35px] mb-4 sm:mb-8 animate-bounce-slow hover:scale-105 transition-all cursor-default group">
          <Star className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-accent animate-pulse" />
          <span className="text-xs sm:text-sm font-black tracking-[0.1em] sm:tracking-[0.2em] uppercase bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent animate-gradient">
            Solana x402 Protocol
          </span>
          <Sparkles className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-primary animate-pulse" style={{ animationDelay: '0.5s' }} />
        </div>
        
        {/* Enhanced main headline with better animations */}
        <div className="space-y-3 sm:space-y-6">
          <h1 className="relative">
            <span className="block text-[12vw] sm:text-[10vw] md:text-[8rem] font-black leading-none tracking-tighter animate-slide-up">
              <span className="inline-block hover:scale-110 transition-bounce cursor-default relative">
                encrypted
                <div className="absolute -inset-4 bg-primary/10 blur-3xl -z-10 opacity-0 group-hover:opacity-100 transition-opacity" />
              </span>
            </span>
            <span className="block text-[15vw] sm:text-[14vw] md:text-[11rem] font-black leading-none tracking-tighter -mt-2 sm:-mt-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <span className="gradient-primary bg-clip-text text-transparent inline-block hover:scale-110 transition-bounce cursor-default animate-gradient relative group">
                messaging
                <div className="absolute inset-0 blur-2xl bg-gradient-to-r from-primary to-secondary opacity-30 -z-10" />
              </span>
            </span>
            <span className="block text-[8vw] sm:text-[7vw] md:text-[5rem] font-black leading-none tracking-tight text-muted-foreground mt-1 sm:mt-2 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <span className="inline-block hover:text-foreground transition-all cursor-default hover:scale-105">
                wallet to wallet
              </span>
            </span>
          </h1>
        </div>

        {/* Enhanced feature highlights with better styling */}
        <TooltipProvider>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 max-w-3xl mx-auto animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 sm:gap-3 glass-glow px-3 py-1.5 sm:px-6 sm:py-3 rounded-[20px] sm:rounded-[35px] hover:scale-105 hover-glow transition-all cursor-default group">
                  <div className="p-1 sm:p-2 rounded-full bg-primary/20 group-hover:bg-primary/30 transition-all">
                    <Lock className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold">End-to-End Encrypted</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-semibold">Only you and recipient can read</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 sm:gap-3 glass-glow px-3 py-1.5 sm:px-6 sm:py-3 rounded-[20px] sm:rounded-[35px] hover:scale-105 hover-glow transition-all cursor-default group">
                  <div className="p-1 sm:p-2 rounded-full bg-secondary/20 group-hover:bg-secondary/30 transition-all">
                    <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-secondary" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold">Gasless Payments</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-semibold">No transaction fees for you</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 sm:gap-3 glass-glow px-3 py-1.5 sm:px-6 sm:py-3 rounded-[20px] sm:rounded-[35px] hover:scale-105 hover-glow transition-all cursor-default group">
                  <div className="p-1 sm:p-2 rounded-full bg-accent/20 group-hover:bg-accent/30 transition-all">
                    <Shield className="w-3 h-3 sm:w-4 sm:h-4 text-accent" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold">Zero Knowledge</span>
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

        {/* Enhanced CTA Button with better glow */}
        <div className="pt-8 animate-slide-up" style={{ animationDelay: '0.5s' }}>
          <div className="inline-block relative group">
            {/* Enhanced glow effect */}
            <div className="absolute -inset-12 bg-gradient-to-r from-primary via-secondary to-accent opacity-40 blur-[60px] group-hover:opacity-70 transition-all duration-700 rounded-full animate-pulse-glow" />
            <div className="absolute -inset-8 bg-gradient-to-r from-primary/50 via-secondary/50 to-accent/50 opacity-20 blur-2xl group-hover:opacity-40 transition-all duration-500 rounded-full" />
            <div className="relative transform group-hover:scale-110 transition-bounce">
              <WalletButton />
            </div>
          </div>
        </div>

        {/* Enhanced trust indicators */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-8 pt-4 sm:pt-8 animate-slide-up" style={{ animationDelay: '0.6s' }}>
          <div className="flex items-center gap-2 sm:gap-3 glass px-3 py-1.5 sm:px-4 sm:py-2 rounded-[20px] sm:rounded-[35px] hover:scale-105 transition-all cursor-default group">
            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-accent animate-pulse group-hover:scale-125 transition-transform" />
            <span className="text-xs sm:text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">Military-grade encryption</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 glass px-3 py-1.5 sm:px-4 sm:py-2 rounded-[20px] sm:rounded-[35px] hover:scale-105 transition-all cursor-default group">
            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-secondary animate-pulse group-hover:scale-125 transition-transform" style={{ animationDelay: '0.5s' }} />
            <span className="text-xs sm:text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">~$0.01 per message</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 glass px-3 py-1.5 sm:px-4 sm:py-2 rounded-[20px] sm:rounded-[35px] hover:scale-105 transition-all cursor-default group">
            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-primary animate-pulse group-hover:scale-125 transition-transform" style={{ animationDelay: '1s' }} />
            <span className="text-xs sm:text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">No accounts needed</span>
          </div>
        </div>
      </div>

    </section>
  );
};
