import { useEffect, useRef, useState } from 'react';
import { Wallet, Shield, Send, ArrowRight } from 'lucide-react';

export const HowItWorks = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const stepRefs = [useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null)];
  const [isVisible, setIsVisible] = useState(false);
  const [visibleSteps, setVisibleSteps] = useState<boolean[]>([false, false, false]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const observers = stepRefs.map((ref, index) => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setVisibleSteps(prev => {
              const newState = [...prev];
              newState[index] = true;
              return newState;
            });
          }
        },
        { threshold: 0.3 }
      );

      if (ref.current) {
        observer.observe(ref.current);
      }

      return observer;
    });

    return () => observers.forEach(observer => observer.disconnect());
  }, []);

  const steps = [
    {
      icon: Wallet,
      number: '01',
      title: 'Connect Wallet',
      subtitle: 'No signup required',
      description: 'Connect your Solana wallet to get started instantly. No email, no password, no personal data.',
      details: ['One-click connection', 'Supports all major wallets', 'Instant access'],
      color: 'primary',
      gradient: 'from-primary to-primary/70',
      glow: 'shadow-glow'
    },
    {
      icon: Shield,
      number: '02',
      title: 'Compose & Encrypt',
      subtitle: 'Military-grade security',
      description: 'Write your message and we encrypt it with AES-256-GCM before it ever leaves your device.',
      details: ['End-to-end encryption', 'Client-side processing', 'Zero-knowledge architecture'],
      color: 'secondary',
      gradient: 'from-secondary to-secondary/70',
      glow: 'shadow-glow-cyan'
    },
    {
      icon: Send,
      number: '03',
      title: 'Send via Solana',
      subtitle: 'Instant & secure',
      description: 'Your encrypted message is transmitted via Solana blockchain. Recipient pays $0.0001 to decrypt.',
      details: ['Lightning-fast delivery', 'Spam protection built-in', 'Blockchain verified'],
      color: 'accent',
      gradient: 'from-accent to-accent/70',
      glow: 'shadow-glow-secure'
    }
  ];

  return (
    <section id="how-it-works" ref={sectionRef} className="gradient-section py-16 sm:py-20 md:py-28 px-4 sm:px-6 relative overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 security-grid opacity-20" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <div className={`text-center max-w-3xl mx-auto mb-12 sm:mb-16 md:mb-20 fade-in-up ${isVisible ? 'visible' : ''}`}>
          <div className="inline-flex items-center gap-2 glass-card px-4 py-2 rounded-full mb-6 border border-primary/20">
            <Shield className="w-4 h-4 text-primary animate-lock-pulse" />
            <span className="text-xs sm:text-sm font-bold tracking-wider text-primary uppercase">
              How It Works
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4 sm:mb-6 leading-tight">
            <span className="gradient-primary bg-clip-text text-transparent">Three Simple Steps</span>
            <br />
            <span className="text-foreground">to Secure Messaging</span>
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            Experience private, encrypted communication with the power of blockchain technology
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 lg:gap-8">
            {steps.map((step, index) => (
              <div
                key={index}
                ref={stepRefs[index]}
                className={`fade-in-up ${visibleSteps[index] ? 'visible' : ''}`}
                style={{ transitionDelay: `${index * 0.2}s` }}
              >
                <div className="glass-card rounded-3xl p-6 sm:p-8 border border-border/50 hover:border-primary/30 transition-all duration-500 hover-lift h-full relative group">
                  {/* Glow Effect on Hover */}
                  <div className={`absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500 ${step.glow}`} />
                  
                  {/* Number Badge */}
                  <div className={`inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br ${step.gradient} text-white font-black text-xl sm:text-2xl mb-6 relative z-10`}>
                    {step.number}
                  </div>

                  {/* Icon */}
                  <div className={`inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl glass-card border-2 border-${step.color}/30 mb-6 relative z-10`}>
                    <step.icon className={`w-8 h-8 sm:w-10 sm:h-10 text-${step.color}`} />
                  </div>

                  {/* Content */}
                  <div className="space-y-4 relative z-10">
                    <div>
                      <h3 className="text-2xl sm:text-3xl font-black mb-2 text-foreground">
                        {step.title}
                      </h3>
                      <p className={`text-xs sm:text-sm font-semibold text-${step.color} uppercase tracking-wider`}>
                        {step.subtitle}
                      </p>
                    </div>

                    <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>

                    {/* Details List */}
                    <ul className="space-y-2 pt-2">
                      {step.details.map((detail, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <div className={`w-1.5 h-1.5 rounded-full bg-${step.color} mt-1.5 flex-shrink-0`} />
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Connection Lines (Desktop Only) */}
          <div className="hidden md:block absolute top-1/2 left-0 right-0 -translate-y-1/2 pointer-events-none">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
              <div className="flex items-center justify-between">
                {[0, 1].map((index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-4 fade-in ${visibleSteps[index] ? 'visible' : ''}`}
                    style={{ 
                      transitionDelay: `${(index + 1) * 0.3}s`,
                      width: '33.33%',
                      justifyContent: 'flex-end',
                      paddingRight: '1rem'
                    }}
                  >
                    <div className="h-px bg-gradient-to-r from-primary/50 to-secondary/50 flex-1 animate-draw-line" />
                    <ArrowRight className="w-6 h-6 text-primary/70 animate-arrow-enter" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
