import { useEffect, useRef, useState } from 'react';
import { Shield, Zap, Lock, Eye, Coins, Globe } from 'lucide-react';

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
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const features = [
    {
      icon: Lock,
      title: 'End-to-End Encryption',
      description: 'Military-grade AES-256-GCM encryption ensures your messages remain private and secure.'
    },
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Messages delivered in seconds via Solana\'s high-performance blockchain network.'
    },
    {
      icon: Eye,
      title: 'Zero Knowledge',
      description: 'No email required. No tracking. No data collection. Complete anonymity guaranteed.'
    },
    {
      icon: Shield,
      title: 'Spam Protection Built-In',
      description: 'Minimal anti-spam fee (< $0.0001) prevents unwanted messages while keeping communication virtually free.'
    },
    {
      icon: Coins,
      title: 'Gasless Transactions',
      description: 'Send unlimited messages with negligible fees. No transaction costs, no hidden charges.'
    },
    {
      icon: Globe,
      title: 'Decentralized',
      description: 'No central servers. No single point of failure. Your data stays on the blockchain.'
    }
  ];

  return (
    <section ref={sectionRef} className="gradient-section py-16 sm:py-20 md:py-28 px-4 sm:px-6 relative overflow-hidden scanline">
      {/* Background Effects */}
      <div className="absolute inset-0 security-grid opacity-15" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <div className={`text-center max-w-3xl mx-auto mb-12 sm:mb-16 fade-in-up ${isVisible ? 'visible' : ''}`}>
          <div className="inline-flex items-center gap-2 glass-card px-4 py-2 rounded-full mb-6 border border-primary/20">
            <Shield className="w-4 h-4 text-primary animate-lock-pulse" />
            <span className="text-xs sm:text-sm font-bold tracking-wider text-primary uppercase">
              Features
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4 sm:mb-6 leading-tight">
            <span className="text-foreground">Privacy meets</span>
            <br />
            <span className="gradient-primary bg-clip-text text-transparent">simplicity</span>
          </h2>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`fade-in-up ${isVisible ? 'visible' : ''}`}
              style={{ transitionDelay: `${index * 0.1}s` }}
            >
              <div className="glass-card rounded-2xl p-6 sm:p-8 border border-border/50 hover:border-primary/40 transition-all duration-500 hover-lift h-full group relative overflow-hidden">
                {/* Animated Border Scanner */}
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent animate-shimmer" />
                </div>

                {/* Icon */}
                <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl glass-card border-2 border-primary/30 mb-6 relative z-10 group-hover:scale-110 group-hover:border-primary/60 transition-all duration-500">
                  <feature.icon className="w-7 h-7 sm:w-8 sm:h-8 text-primary group-hover:animate-lock-pulse" />
                </div>

                {/* Content */}
                <div className="relative z-10">
                  <h3 className="text-xl sm:text-2xl font-black mb-3 text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>

                {/* Security Checkmark Animation */}
                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="w-8 h-8 rounded-full bg-accent/20 border-2 border-accent flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-accent animate-lock-pulse" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
