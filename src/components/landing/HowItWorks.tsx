import { Wallet, Lock, Zap, ArrowRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export const HowItWorks = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

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

  const steps = [
    {
      icon: Wallet,
      number: '01',
      title: 'Connect',
      description: 'Your Solana wallet = your identity',
      detail: 'No email, no passwords, no accounts',
      color: 'primary',
    },
    {
      icon: Lock,
      number: '02',
      title: 'Encrypt',
      description: 'Write your private message',
      detail: 'End-to-end encrypted with Web Crypto API',
      color: 'secondary',
    },
    {
      icon: Zap,
      number: '03',
      title: 'Send',
      description: 'Pay micro-fee to deliver',
      detail: 'Gasless x402 payment prevents spam',
      color: 'accent',
    },
  ];

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      className="min-h-screen bg-background py-32 px-6 relative overflow-hidden"
    >
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section title */}
        <div className={`mb-24 fade-in-up ${isVisible ? 'visible' : ''}`}>
          <span className="text-lg uppercase tracking-[0.3em] text-primary font-bold mb-4 block">Process</span>
          <h2 className="text-6xl md:text-7xl font-black">
            How it
            <br />
            <span className="gradient-primary bg-clip-text text-transparent">works</span>
          </h2>
        </div>

        {/* Steps with creative layout */}
        <div className="space-y-12">
          {steps.map((step, index) => (
            <div
              key={index}
              className={`fade-in-up ${isVisible ? 'visible' : ''}`}
              style={{ transitionDelay: `${index * 150}ms` }}
            >
              <div className="grid md:grid-cols-12 gap-8 items-center">
                {/* Number */}
                <div className="md:col-span-2">
                  <div className={`text-8xl font-black text-${step.color} opacity-20`}>
                    {step.number}
                  </div>
                </div>

                {/* Icon & Title */}
                <div className="md:col-span-4">
                  <div className="flex items-center gap-6">
                    <div className={`w-20 h-20 rounded-2xl bg-${step.color}/10 border border-${step.color}/30 flex items-center justify-center`}>
                      <step.icon className={`w-10 h-10 text-${step.color}`} />
                    </div>
                    <h3 className="text-4xl font-black">{step.title}</h3>
                  </div>
                </div>

                {/* Description */}
                <div className="md:col-span-6">
                  <div className="glass-strong p-8 rounded-2xl hover:scale-105 transition-slow">
                    <p className="text-2xl font-bold mb-2">{step.description}</p>
                    <p className="text-lg text-muted-foreground">{step.detail}</p>
                  </div>
                </div>
              </div>

              {/* Arrow connector (except last) */}
              {index < steps.length - 1 && (
                <div className="flex justify-center my-8">
                  <ArrowRight className="w-8 h-8 text-muted-foreground/30 rotate-90" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
