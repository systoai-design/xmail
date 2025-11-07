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
        {/* Enhanced Title */}
        <div className={`text-center mb-12 sm:mb-16 md:mb-20 fade-in-up ${isVisible ? 'visible' : ''} px-4`}>
          <span className="text-sm sm:text-lg uppercase tracking-[0.2em] sm:tracking-[0.3em] font-black mb-4 sm:mb-6 block bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent">
            Features
          </span>
          <h2 className="text-4xl sm:text-6xl md:text-8xl font-black max-w-4xl mx-auto leading-tight">
            <span className="inline-block hover:scale-105 transition-transform cursor-default">
              Privacy meets
            </span>
            <br />
            <span className="gradient-primary bg-clip-text text-transparent inline-block hover:scale-105 transition-transform cursor-default animate-gradient">
              simplicity
            </span>
          </h2>
        </div>

        {/* Enhanced Features grid with staggered layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 md:gap-10">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`fade-in-up ${isVisible ? 'visible' : ''} ${index % 2 === 1 ? 'md:mt-16' : ''}`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div className="glass-glow p-6 sm:p-10 md:p-12 rounded-[24px] sm:rounded-[35px] hover-lift hover-glow h-full group cursor-pointer border-2 border-transparent hover:border-primary/40 relative">
                {/* Glow effect */}
                <div className="absolute -inset-4 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-3xl rounded-[28px] sm:rounded-[40px] -z-10" />
                
                {/* Icon container */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[20px] sm:rounded-[35px] glass-glow border-2 border-primary/30 flex items-center justify-center mb-6 sm:mb-8 group-hover:scale-110 group-hover:rotate-6 transition-all shadow-lg">
                  <feature.icon className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
                </div>
                
                <h3 className="text-2xl sm:text-3xl md:text-4xl font-black mb-4 sm:mb-6 group-hover:gradient-primary group-hover:bg-clip-text group-hover:text-transparent transition-all">
                  {feature.title}
                </h3>
                <p className="text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed group-hover:text-foreground transition-colors">
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
