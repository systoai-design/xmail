import { Wallet, Lock, Zap, ArrowRight, Sparkles } from 'lucide-react';
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
    },
  ];

  const stepRefs = [step1Ref, step2Ref, step3Ref];

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      className="min-h-screen bg-background py-24 px-6 relative overflow-hidden"
    >
      {/* Animated background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-0 w-full h-full" style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, hsl(267 100% 35%) 0px, transparent 50%), radial-gradient(circle at 80% 80%, hsl(187 100% 35%) 0px, transparent 50%)',
        }} />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section header */}
        <div className={`text-center mb-16 fade-in-up ${isVisible ? 'visible' : ''}`}>
          <div className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm uppercase tracking-wider font-bold">The Process</span>
          </div>
          <h2 className="text-6xl md:text-8xl font-black mb-6">
            How it
            <br />
            <span className="gradient-primary bg-clip-text text-transparent">works</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Three simple steps to secure, encrypted messaging
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {steps.map((step, index) => (
            <div
              key={index}
              ref={stepRefs[index]}
              className={`fade-in-up ${isVisible ? 'visible' : ''}`}
              style={{ transitionDelay: `${index * 150}ms` }}
            >
              <div className={`relative glass-strong p-8 rounded-[35px] hover-lift cursor-default h-full bg-gradient-to-br ${step.gradient} border border-white/5`}>
                {/* Number badge */}
                <div className="absolute -top-4 -right-4 w-16 h-16 rounded-[35px] bg-background border-2 border-primary/30 flex items-center justify-center shadow-glow">
                  <span className="text-2xl font-black text-primary">{step.number}</span>
                </div>

                {/* Icon */}
                <div className={`w-20 h-20 rounded-[35px] bg-gradient-to-br ${step.gradient} border border-${step.color}/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <step.icon className={`w-10 h-10 text-${step.color}`} />
                </div>

                {/* Content */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-4xl font-black mb-1">{step.title}</h3>
                    <p className="text-lg text-muted-foreground font-semibold">{step.subtitle}</p>
                  </div>

                  <p className="text-lg font-medium">{step.description}</p>

                  <ul className="space-y-2">
                    {step.details.map((detail, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className={`w-1.5 h-1.5 rounded-full bg-${step.color}`} />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Progressive Flow indicator */}
        <div className="flex items-center justify-center gap-4">
          {/* Line 1 - appears with step 1 */}
          <div 
            className={`h-1 w-32 bg-gradient-to-r from-transparent via-primary to-transparent ${step1Visible ? 'animate-draw-line' : 'opacity-0'}`}
          />
          {/* Arrow 1 - appears after step 1 */}
          <ArrowRight 
            className={`w-6 h-6 text-primary ${step1Visible ? 'animate-arrow-enter' : 'opacity-0'}`}
            style={{ animationDelay: '0.4s' }}
          />
          {/* Line 2 - appears with step 2 */}
          <div 
            className={`h-1 w-32 bg-gradient-to-r from-transparent via-secondary to-transparent ${step2Visible ? 'animate-draw-line' : 'opacity-0'}`}
          />
          {/* Arrow 2 - appears after step 2 */}
          <ArrowRight 
            className={`w-6 h-6 text-secondary ${step2Visible ? 'animate-arrow-enter' : 'opacity-0'}`}
            style={{ animationDelay: '0.4s' }}
          />
          {/* Line 3 - appears with step 3 */}
          <div 
            className={`h-1 w-32 bg-gradient-to-r from-transparent via-accent to-transparent ${step3Visible ? 'animate-draw-line' : 'opacity-0'}`}
          />
        </div>
      </div>
    </section>
  );
};
