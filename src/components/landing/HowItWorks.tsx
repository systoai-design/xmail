import { Wallet, Lock, Zap } from 'lucide-react';
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
      title: 'Connect Wallet',
      description: 'Your Solana wallet is your identity. No email, no passwords.',
      color: 'text-primary',
    },
    {
      icon: Lock,
      title: 'Compose Message',
      description: 'Write your message. It\'s encrypted end-to-end using Web Crypto API.',
      color: 'text-secondary',
    },
    {
      icon: Zap,
      title: 'Send via x402',
      description: 'Micropayment confirms delivery. Gasless. Instant. Spam-free.',
      color: 'text-accent',
    },
  ];

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      className="min-h-screen bg-background py-24 px-6"
    >
      <div className="max-w-7xl mx-auto">
        <h2
          className={`text-7xl md:text-8xl font-black text-center mb-20 fade-in-up ${
            isVisible ? 'visible' : ''
          }`}
        >
          HOW IT WORKS
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {steps.map((step, index) => (
            <div
              key={index}
              className={`glass-strong p-12 rounded-3xl hover:scale-105 transition-slow hover:shadow-glow-strong fade-in-up ${
                isVisible ? 'visible' : ''
              }`}
              style={{ transitionDelay: `${index * 150}ms` }}
            >
              <div className="flex flex-col items-center text-center space-y-6">
                <div className={`w-20 h-20 rounded-full bg-background/50 flex items-center justify-center ${step.color}`}>
                  <step.icon className="w-10 h-10" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-3xl font-black">{step.title}</h3>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
                <div className={`text-6xl font-black ${step.color} opacity-20`}>
                  {index + 1}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
