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
        {/* Section header */}
        <div className={`text-center mb-16 sm:mb-20 fade-in-up ${isVisible ? 'visible' : ''} space-y-6`}>
          <div className="inline-flex items-center gap-2 glass-card px-4 py-2 rounded-full">
            <Hexagon className="w-4 h-4 text-primary" />
            <span className="text-xs uppercase tracking-wider font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              The Process
            </span>
          </div>
          
          <h2 className="text-4xl sm:text-5xl md:text-7xl font-extrabold leading-tight">
            <span className="block">How it</span>
            <span className="gradient-primary bg-clip-text text-transparent block">
              works
            </span>
          </h2>
          
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Three simple steps to <span className="text-foreground font-semibold">secure, encrypted messaging</span>
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
              <div className={`relative glass-glow p-6 sm:p-8 rounded-3xl hover-lift hover-glow-subtle cursor-default h-full bg-gradient-to-br ${step.gradient} border border-transparent hover:border-${step.color}/20 group`}>
                <div 
                  className="absolute -inset-2 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl -z-10"
                  style={{ background: step.glowColor.replace('0.4', '0.15') }}
                />

                {/* Number badge - smaller, more elegant */}
                <div className="absolute -top-3 -right-3 sm:-top-4 sm:-right-4 w-10 h-10 sm:w-12 sm:h-12 rounded-2xl glass-card border border-primary/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <span className="text-sm sm:text-base font-black gradient-primary bg-clip-text text-transparent">{step.number}</span>
                </div>

                {/* Icon - refined size */}
                <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl glass-card bg-gradient-to-br ${step.gradient} border border-${step.color}/30 flex items-center justify-center mb-6 group-hover:scale-105 transition-all`}>
                  <step.icon className={`w-7 h-7 sm:w-8 sm:h-8 text-${step.color}`} />
                </div>

                {/* Content */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-2xl sm:text-3xl font-extrabold mb-1">{step.title}</h3>
                    <p className="text-base sm:text-lg text-muted-foreground font-semibold">{step.subtitle}</p>
                  </div>

                  <p className="text-sm sm:text-base leading-relaxed text-muted-foreground">{step.description}</p>

                  <ul className="space-y-2">
                    {step.details.map((detail, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                        <div className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-${step.color}`} />
                        <span>{detail}</span>
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
