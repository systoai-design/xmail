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
    <section ref={sectionRef} className="min-h-screen gradient-section py-16 sm:py-20 md:py-24 px-4 sm:px-6 relative overflow-hidden">
      {/* Enhanced background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(circle at 80% 20%, hsl(267 100% 35%) 0px, transparent 50%), radial-gradient(circle at 20% 80%, hsl(187 100% 35%) 0px, transparent 50%)'
        }} />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <div className={`text-center mb-16 sm:mb-20 fade-in-up ${isVisible ? 'visible' : ''} space-y-6`}>
          <div className="inline-flex items-center gap-2 glass-card px-4 py-2 rounded-full">
            <span className="text-xs uppercase tracking-wider font-bold bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent">
              Features
            </span>
          </div>
          
          <h2 className="text-4xl sm:text-5xl md:text-7xl font-extrabold max-w-4xl mx-auto leading-tight">
            <span className="block">Privacy meets</span>
            <span className="gradient-primary bg-clip-text text-transparent block">
              simplicity
            </span>
          </h2>
        </div>

        {/* Features grid - aligned, no stagger */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`fade-in-up ${isVisible ? 'visible' : ''}`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div className="glass-glow p-6 sm:p-8 rounded-3xl hover-lift hover-glow-subtle h-full group cursor-pointer border border-transparent hover:border-primary/20 relative">
                <div className="absolute -inset-2 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl rounded-3xl -z-10" />
                
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl glass-card border border-primary/20 flex items-center justify-center mb-6 group-hover:scale-105 transition-all">
                  <feature.icon className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
                </div>
                
                <h3 className="text-xl sm:text-2xl md:text-3xl font-extrabold mb-4 group-hover:text-primary transition-colors">
                  {feature.title}
                </h3>
                <p className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed">
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
