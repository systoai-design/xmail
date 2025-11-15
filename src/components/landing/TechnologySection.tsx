import { useEffect, useRef, useState } from 'react';
import { Shield } from 'lucide-react';

export const TechnologySection = () => {
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

  const technologies = [
    {
      name: 'Solana',
      description: 'Lightning-fast blockchain for instant message delivery',
      color: 'text-primary',
    },
    {
      name: 'X402 Protocol',
      description: 'Spam protection layer with minimal anti-spam fees',
      color: 'text-secondary',
    },
    {
      name: 'Web Crypto API',
      description: 'Browser-native encryption for maximum security',
      color: 'text-accent',
    },
  ];

  return (
    <section ref={sectionRef} className="gradient-section py-16 sm:py-20 md:py-24 px-4 sm:px-6 relative overflow-hidden">
      {/* Binary Code Overlay */}
      <div className="absolute inset-0 security-grid opacity-10" />
      
      <div className="max-w-5xl mx-auto relative z-10">
        <div className={`text-center mb-12 sm:mb-16 fade-in-up ${isVisible ? 'visible' : ''} space-y-6`}>
          <div className="inline-flex items-center gap-2 glass-card px-4 py-2 rounded-full border border-primary/20">
            <Shield className="w-4 h-4 text-primary animate-lock-pulse" />
            <span className="text-xs sm:text-sm font-bold tracking-wider text-primary uppercase">
              Powered By
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black gradient-primary bg-clip-text text-transparent">
            Built on the best
          </h2>
        </div>

        <div className="space-y-5 sm:space-y-6">
          {technologies.map((tech, index) => (
            <div
              key={index}
              className={`glass-card p-6 sm:p-8 rounded-2xl border border-border/50 hover:border-primary/30 hover-lift transition-all fade-in-up ${
                isVisible ? 'visible' : ''
              }`}
              style={{ 
                transitionDelay: `${index * 100}ms`
              }}
            >
              <h3 className={`text-2xl sm:text-3xl md:text-4xl font-black mb-2 ${tech.color}`}>
                {tech.name}
              </h3>
              <p className="text-sm sm:text-base md:text-lg text-muted-foreground">
                {tech.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
