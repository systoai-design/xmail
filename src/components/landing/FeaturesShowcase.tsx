import { Shield, User, Ban, Database } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export const FeaturesShowcase = () => {
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

  const features = [
    {
      icon: Shield,
      title: 'End-to-End Encrypted',
      description: 'Only your recipient can decrypt. Zero-knowledge encryption using Web Crypto API.',
      gradient: 'from-primary/20 to-primary/5',
    },
    {
      icon: User,
      title: 'Wallet-Based Identity',
      description: 'Your wallet is your address. No accounts, no passwords, no intermediaries.',
      gradient: 'from-secondary/20 to-secondary/5',
    },
    {
      icon: Ban,
      title: 'Spam-Free',
      description: 'x402 micropayments prevent spam. Only serious messages reach your inbox.',
      gradient: 'from-accent/20 to-accent/5',
    },
    {
      icon: Database,
      title: 'Decentralized',
      description: 'Messages on Solana blockchain. No central server can read or censor your data.',
      gradient: 'from-purple-500/20 to-purple-500/5',
    },
  ];

  return (
    <section ref={sectionRef} className="gradient-section py-32 px-6 relative">
      <div className="max-w-7xl mx-auto">
        <h2
          className={`text-7xl md:text-8xl font-black text-center mb-8 fade-in-up ${
            isVisible ? 'visible' : ''
          }`}
        >
          Privacy meets
          <br />
          <span className="gradient-primary bg-clip-text text-transparent">
            simplicity
          </span>
        </h2>

        <p
          className={`text-2xl text-muted-foreground text-center mb-20 max-w-3xl mx-auto fade-in-up ${
            isVisible ? 'visible' : ''
          }`}
          style={{ transitionDelay: '100ms' }}
        >
          Built for those who value privacy without compromising on user experience
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`glass p-10 rounded-3xl hover:scale-105 transition-slow bg-gradient-to-br ${feature.gradient} fade-in-up ${
                isVisible ? 'visible' : ''
              }`}
              style={{ transitionDelay: `${200 + index * 100}ms` }}
            >
              <feature.icon className="w-16 h-16 text-primary mb-6" />
              <h3 className="text-3xl font-black mb-4">{feature.title}</h3>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
