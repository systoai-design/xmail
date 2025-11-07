import { Wallet, Lock, Zap, ArrowRight, Sparkles, Hexagon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export const HowItWorks = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const step1Ref = useRef<HTMLDivElement>(null);
  const step2Ref = useRef<HTMLDivElement>(null);
  const step3Ref = useRef<HTMLDivElement>(null);
  
  const [isVisible, setIsVisible] = useState(false);
  const [step1Visible, setStep1Visible] = useState(false);
  const [step2Visible, setStep2Visible] = useState(false);
  const [step3Visible, setStep3Visible] = useState(false);

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

  useEffect(() => {
    const observer1 = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStep1Visible(true);
        }
      },
      { threshold: 0.5 }
    );

    const observer2 = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStep2Visible(true);
        }
      },
      { threshold: 0.5 }
    );

    const observer3 = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStep3Visible(true);
        }
      },
      { threshold: 0.5 }
    );

    if (step1Ref.current) observer1.observe(step1Ref.current);
    if (step2Ref.current) observer2.observe(step2Ref.current);
    if (step3Ref.current) observer3.observe(step3Ref.current);

    return () => {
      observer1.disconnect();
      observer2.disconnect();
      observer3.disconnect();
    };
  }, []);

  const steps = [
    {
      icon: Wallet,
      number: '01',
      title: 'Connect',
      subtitle: 'Your Wallet',
      description: 'Your Solana wallet becomes your identity',
      details: ['No email required', 'No passwords', 'No signup forms'],
      color: 'primary',
      gradient: 'from-primary/20 to-primary/5',
      glowColor: 'hsl(267 100% 65% / 0.4)',
    },
    {
      icon: Lock,
      number: '02',
      title: 'Compose',
      subtitle: 'Private Message',
      description: 'Write and encrypt your message',
      details: ['End-to-end encrypted', 'Web Crypto API', 'Zero-knowledge'],
      color: 'secondary',
      gradient: 'from-secondary/20 to-secondary/5',
      glowColor: 'hsl(187 100% 43% / 0.4)',
    },
    {
      icon: Zap,
      number: '03',
      title: 'Send',
      subtitle: 'via x402',
      description: 'Deliver with micropayment',
      details: ['Gasless transaction', '~$0.01 USDC', 'Spam prevention'],
      color: 'accent',
      gradient: 'from-accent/20 to-accent/5',
      glowColor: 'hsl(150 100% 50% / 0.4)',
    },
  ];

  const stepRefs = [step1Ref, step2Ref, step3Ref];

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      className="min-h-screen gradient-section py-16 sm:py-20 md:py-24 px-4 sm:px-6 relative overflow-hidden mt-[-1px]"
    >
      {/* Enhanced animated background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, hsl(267 100% 35%) 0px, transparent 50%), radial-gradient(circle at 80% 80%, hsl(187 100% 35%) 0px, transparent 50%), radial-gradient(circle at 50% 20%, hsl(150 100% 35%) 0px, transparent 50%)'
        }} />
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'repeating-linear-gradient(45deg, hsl(267 100% 65% / 0.03) 0px, hsl(267 100% 65% / 0.03) 2px, transparent 2px, transparent 10px)'
        }} />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Enhanced section header */}
        <div className={`text-center mb-12 sm:mb-16 md:mb-20 fade-in-up ${isVisible ? 'visible' : ''}`}>
          <div className="inline-flex items-center gap-2 sm:gap-3 glass-glow px-4 py-2 sm:px-6 sm:py-3 rounded-full mb-4 sm:mb-8 hover:scale-105 transition-all cursor-default group">
            <Hexagon className="w-4 h-4 sm:w-5 sm:h-5 text-primary animate-pulse" />
            <span className="text-xs sm:text-sm uppercase tracking-[0.2em] sm:tracking-[0.3em] font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              The Process
            </span>
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-secondary animate-pulse" style={{ animationDelay: '0.5s' }} />
          </div>
          <h2 className="text-4xl sm:text-6xl md:text-8xl font-black mb-4 sm:mb-8 leading-tight px-4">
            <span className="inline-block hover:scale-105 transition-transform cursor-default">
              How it
            </span>
            <br />
            <span className="gradient-primary bg-clip-text text-transparent inline-block hover:scale-105 transition-transform cursor-default animate-gradient">
              works
            </span>
          </h2>
          <p className="text-base sm:text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto font-medium px-4">
            Three simple steps to <span className="text-foreground font-bold">secure, encrypted messaging</span>
          </p>
        </div>

        {/* Enhanced steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mb-12 sm:mb-16 md:mb-20">
          {steps.map((step, index) => (
            <div
              key={index}
              ref={stepRefs[index]}
              className={`fade-in-up ${isVisible ? 'visible' : ''}`}
              style={{ transitionDelay: `${index * 150}ms` }}
            >
              <div className={`relative glass-glow p-6 sm:p-8 md:p-10 rounded-[24px] sm:rounded-[35px] hover-lift hover-glow cursor-default h-full bg-gradient-to-br ${step.gradient} border-2 border-transparent hover:border-${step.color}/30 group`}>
                {/* Enhanced glow effect */}
                <div 
                  className="absolute -inset-4 rounded-[28px] sm:rounded-[40px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl -z-10"
                  style={{ background: step.glowColor }}
                />

                {/* Enhanced number badge */}
                <div className="absolute -top-4 -right-4 sm:-top-6 sm:-right-6 w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-[20px] sm:rounded-[35px] glass-glow border-2 border-primary/40 flex items-center justify-center shadow-glow-strong animate-pulse-glow group-hover:scale-110 transition-transform">
                  <span className="text-xl sm:text-2xl md:text-3xl font-black gradient-primary bg-clip-text text-transparent">{step.number}</span>
                </div>

                {/* Enhanced icon */}
                <div className={`w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-[20px] sm:rounded-[35px] glass-glow bg-gradient-to-br ${step.gradient} border-2 border-${step.color}/40 flex items-center justify-center mb-6 sm:mb-8 group-hover:scale-110 group-hover:rotate-6 transition-all shadow-lg`}>
                  <step.icon className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-${step.color}`} />
                </div>

                {/* Enhanced content */}
                <div className="space-y-4 sm:space-y-6">
                  <div>
                    <h3 className="text-3xl sm:text-4xl md:text-5xl font-black mb-2 group-hover:text-${step.color} transition-colors">{step.title}</h3>
                    <p className="text-lg sm:text-xl text-muted-foreground font-bold">{step.subtitle}</p>
                  </div>

                  <p className="text-base sm:text-lg font-medium leading-relaxed">{step.description}</p>

                  <ul className="space-y-2 sm:space-y-3">
                    {step.details.map((detail, i) => (
                      <li key={i} className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                        <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-${step.color} shadow-lg group-hover:scale-125 transition-transform`} />
                        <span className="font-medium">{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Enhanced progressive Flow indicator - vertical on mobile, horizontal on desktop */}
        <div className="flex md:flex-row flex-col items-center justify-center gap-4 md:gap-6">
          {/* Line 1 */}
          <div 
            className={`md:h-1.5 md:w-32 lg:w-40 h-16 w-1.5 bg-gradient-to-b md:bg-gradient-to-r from-transparent via-primary to-transparent rounded-full ${step1Visible ? 'animate-draw-line' : 'opacity-0'}`}
          />
          {/* Arrow 1 */}
          <div className={`${step1Visible ? 'animate-arrow-enter' : 'opacity-0'}`} style={{ animationDelay: '0.4s' }}>
            <div className="p-2 sm:p-3 rounded-full glass-glow border-2 border-primary/30 hover:scale-110 transition-all cursor-default">
              <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 text-primary md:rotate-0 rotate-90" />
            </div>
          </div>
          {/* Line 2 */}
          <div 
            className={`md:h-1.5 md:w-32 lg:w-40 h-16 w-1.5 bg-gradient-to-b md:bg-gradient-to-r from-transparent via-secondary to-transparent rounded-full ${step2Visible ? 'animate-draw-line' : 'opacity-0'}`}
          />
          {/* Arrow 2 */}
          <div className={`${step2Visible ? 'animate-arrow-enter' : 'opacity-0'}`} style={{ animationDelay: '0.4s' }}>
            <div className="p-2 sm:p-3 rounded-full glass-glow border-2 border-secondary/30 hover:scale-110 transition-all cursor-default">
              <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 text-secondary md:rotate-0 rotate-90" />
            </div>
          </div>
          {/* Line 3 */}
          <div 
            className={`md:h-1.5 md:w-32 lg:w-40 h-16 w-1.5 bg-gradient-to-b md:bg-gradient-to-r from-transparent via-accent to-transparent rounded-full ${step3Visible ? 'animate-draw-line' : 'opacity-0'}`}
          />
        </div>
      </div>
    </section>
  );
};
