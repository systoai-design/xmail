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
      description: 'Military-grade encryption. Zero-knowledge architecture. Only your recipient\'s wallet can decrypt.',
    },
    {
      icon: User,
      title: 'Wallet = Identity',
      description: 'No email addresses. No usernames. Your Solana wallet is all you need.',
    },
    {
      icon: Ban,
      title: 'Spam-Free Inbox',
      description: 'Micropayments create a natural spam filter. Only serious messages get through.',
    },
    {
      icon: Database,
      title: 'Fully Decentralized',
      description: 'Messages on blockchain. No servers. No company can read or censor your data.',
    },
  ];

  return (
    <section ref={sectionRef} className="min-h-screen gradient-section py-24 px-6 relative overflow-hidden">
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Title */}
        <div className={`text-center mb-16 fade-in-up ${isVisible ? 'visible' : ''}`}>
          <span className="text-lg uppercase tracking-[0.3em] text-secondary font-bold mb-4 block">Features</span>
          <h2 className="text-6xl md:text-7xl font-black max-w-4xl mx-auto">
            Privacy meets
            <br />
            <span className="gradient-primary bg-clip-text text-transparent">
              simplicity
            </span>
          </h2>
        </div>

        {/* Features grid with staggered layout */}
        <div className="grid md:grid-cols-2 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`fade-in-up ${isVisible ? 'visible' : ''} ${index % 2 === 1 ? 'md:mt-16' : ''}`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div className="glass-strong p-12 rounded-3xl hover:scale-105 transition-slow h-full group cursor-pointer border border-transparent hover:border-primary/30">
                <feature.icon className="w-16 h-16 text-primary mb-6 group-hover:scale-110 transition-smooth" />
                <h3 className="text-3xl font-black mb-4">{feature.title}</h3>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
