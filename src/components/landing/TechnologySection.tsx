import { useEffect, useRef, useState } from 'react';

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
    <section ref={sectionRef} className="gradient-section py-16 sm:py-20 md:py-24 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <div className={`text-center mb-16 fade-in-up ${isVisible ? 'visible' : ''} space-y-4`}>
          <span className="text-xs uppercase tracking-wider font-bold bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent">
            Powered By
          </span>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold gradient-primary bg-clip-text text-transparent">
            Built on the best
          </h2>
        </div>

        <div className="space-y-5 sm:space-y-6">
          {technologies.map((tech, index) => (
            <div
              key={index}
              className={`glass-card p-6 sm:p-8 rounded-2xl hover-glow-subtle transition-all fade-in-up ${
                isVisible ? 'visible' : ''
              }`}
              style={{ 
                transitionDelay: `${index * 100}ms`
              }}
            >
              <h3 className={`text-2xl sm:text-3xl md:text-4xl font-extrabold mb-2 ${tech.color}`}>
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
