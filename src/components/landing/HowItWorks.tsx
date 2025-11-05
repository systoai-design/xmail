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
      className="min-h-screen bg-background py-24 px-6 relative overflow-hidden"
    >
      {/* Enhanced animated background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, hsl(267 100% 35%) 0px, transparent 50%), radial-gradient(circle at 80% 80%, hsl(187 100% 35%) 0px, transparent 50%), radial-gradient(circle at 50% 20%, hsl(150 100% 35%) 0px, transparent 50%)',
        }} />
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'repeating-linear-gradient(45deg, hsl(267 100% 65% / 0.03) 0px, hsl(267 100% 65% / 0.03) 2px, transparent 2px, transparent 10px)',
        }} />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Enhanced section header */}
        <div className={`text-center mb-20 fade-in-up ${isVisible ? 'visible' : ''}`}>
          <div className="inline-flex items-center gap-3 glass-glow px-6 py-3 rounded-full mb-8 hover:scale-105 transition-all cursor-default group">
            <Hexagon className="w-5 h-5 text-primary animate-pulse" />
            <span className="text-sm uppercase tracking-[0.3em] font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              The Process
            </span>
            <Sparkles className="w-5 h-5 text-secondary animate-pulse" style={{ animationDelay: '0.5s' }} />
          </div>
          <h2 className="text-6xl md:text-8xl font-black mb-8 leading-tight">
            <span className="inline-block hover:scale-105 transition-transform cursor-default">
              How it
            </span>
            <br />
            <span className="gradient-primary bg-clip-text text-transparent inline-block hover:scale-105 transition-transform cursor-default animate-gradient">
              works
            </span>
          </h2>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto font-medium">
            Three simple steps to <span className="text-foreground font-bold">secure, encrypted messaging</span>
          </p>
        </div>

        {/* Enhanced steps */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          {steps.map((step, index) => (
            <div
              key={index}
              ref={stepRefs[index]}
              className={`fade-in-up ${isVisible ? 'visible' : ''}`}
              style={{ transitionDelay: `${index * 150}ms` }}
            >
              <div className={`relative glass-glow p-10 rounded-[35px] hover-lift hover-glow cursor-default h-full bg-gradient-to-br ${step.gradient} border-2 border-transparent hover:border-${step.color}/30 group`}>
                {/* Enhanced glow effect */}
                <div 
                  className="absolute -inset-4 rounded-[40px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl -z-10"
                  style={{ background: step.glowColor }}
                />

                {/* Enhanced number badge */}
                <div className="absolute -top-6 -right-6 w-20 h-20 rounded-[35px] glass-glow border-2 border-primary/40 flex items-center justify-center shadow-glow-strong animate-pulse-glow group-hover:scale-110 transition-transform">
                  <span className="text-3xl font-black gradient-primary bg-clip-text text-transparent">{step.number}</span>
                </div>

                {/* Enhanced icon */}
                <div className={`w-24 h-24 rounded-[35px] glass-glow bg-gradient-to-br ${step.gradient} border-2 border-${step.color}/40 flex items-center justify-center mb-8 group-hover:scale-110 group-hover:rotate-6 transition-all shadow-lg`}>
                  <step.icon className={`w-12 h-12 text-${step.color}`} />
                </div>

                {/* Enhanced content */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-4xl md:text-5xl font-black mb-2 group-hover:text-${step.color} transition-colors">{step.title}</h3>
                    <p className="text-xl text-muted-foreground font-bold">{step.subtitle}</p>
                  </div>

                  <p className="text-lg font-medium leading-relaxed">{step.description}</p>

                  <ul className="space-y-3">
                    {step.details.map((detail, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                        <div className={`w-2 h-2 rounded-full bg-${step.color} shadow-lg group-hover:scale-125 transition-transform`} />
                        <span className="font-medium">{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Enhanced progressive Flow indicator */}
        <div className="flex items-center justify-center gap-6 flex-wrap">
          {/* Line 1 */}
          <div 
            className={`h-1.5 w-40 bg-gradient-to-r from-transparent via-primary to-transparent rounded-full ${step1Visible ? 'animate-draw-line' : 'opacity-0'}`}
          />
          {/* Arrow 1 */}
          <div className={`${step1Visible ? 'animate-arrow-enter' : 'opacity-0'}`} style={{ animationDelay: '0.4s' }}>
            <div className="p-3 rounded-full glass-glow border-2 border-primary/30 hover:scale-110 transition-all cursor-default">
              <ArrowRight className="w-6 h-6 text-primary" />
            </div>
          </div>
          {/* Line 2 */}
          <div 
            className={`h-1.5 w-40 bg-gradient-to-r from-transparent via-secondary to-transparent rounded-full ${step2Visible ? 'animate-draw-line' : 'opacity-0'}`}
          />
          {/* Arrow 2 */}
          <div className={`${step2Visible ? 'animate-arrow-enter' : 'opacity-0'}`} style={{ animationDelay: '0.4s' }}>
            <div className="p-3 rounded-full glass-glow border-2 border-secondary/30 hover:scale-110 transition-all cursor-default">
              <ArrowRight className="w-6 h-6 text-secondary" />
            </div>
          </div>
          {/* Line 3 */}
          <div 
            className={`h-1.5 w-40 bg-gradient-to-r from-transparent via-accent to-transparent rounded-full ${step3Visible ? 'animate-draw-line' : 'opacity-0'}`}
          />
        </div>
      </div>
    </section>
  );
};
