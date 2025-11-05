import { useEffect, useRef, useState } from 'react';
import { useParallax } from '@/hooks/useParallax';

export const TechnologySection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const parallax1 = useParallax(0.1);
  const parallax2 = useParallax(0.15);
  const parallax3 = useParallax(0.2);

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
      name: 'x402 Protocol',
      description: 'HTTP micropayments for spam-free communication',
      color: 'text-secondary',
    },
    {
      name: 'Web Crypto API',
      description: 'Browser-native encryption for maximum security',
      color: 'text-accent',
    },
  ];

  return (
    <section ref={sectionRef} className="bg-background py-16 sm:py-20 md:py-24 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <h2
          className={`text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-center mb-10 sm:mb-12 md:mb-16 fade-in-up gradient-primary bg-clip-text text-transparent ${
            isVisible ? 'visible' : ''
          }`}
        >
          POWERED BY
        </h2>

        <div className="space-y-6 sm:space-y-8">
          {technologies.map((tech, index) => (
            <div
              key={index}
              className={`glass-strong p-6 sm:p-8 md:p-10 rounded-2xl sm:rounded-3xl hover:shadow-glow transition-slow fade-in-up parallax-layer ${
                isVisible ? 'visible' : ''
              }`}
              style={{ 
                transitionDelay: `${index * 150}ms`,
                transform: index === 0 ? parallax1.transform : index === 1 ? parallax2.transform : parallax3.transform
              }}
            >
              <h3 className={`text-3xl sm:text-4xl md:text-5xl font-black mb-2 sm:mb-3 ${tech.color}`}>
                {tech.name}
              </h3>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground">
                {tech.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
