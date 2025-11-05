import { WalletButton } from '@/components/WalletButton';
import { CurvedDivider } from './CurvedDivider';
import { useEffect, useRef, useState } from 'react';

export const CTASection = () => {
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

  return (
    <section ref={sectionRef} className="relative bg-background">
      <CurvedDivider color="hsl(267 100% 20%)" />
      <div className="gradient-hero py-32 px-6">
        <div className="max-w-5xl mx-auto text-center space-y-12">
          <h2
            className={`text-7xl md:text-8xl font-black leading-tight fade-in-up ${
              isVisible ? 'visible' : ''
            }`}
          >
            let's start sending
            <br />
            <span className="gradient-primary bg-clip-text text-transparent">
              encrypted messages
            </span>
          </h2>

          <p
            className={`text-2xl text-muted-foreground max-w-2xl mx-auto fade-in-up ${
              isVisible ? 'visible' : ''
            }`}
            style={{ transitionDelay: '100ms' }}
          >
            Join the future of private, decentralized communication
          </p>

          <div
            className={`pt-6 fade-in-up ${isVisible ? 'visible' : ''}`}
            style={{ transitionDelay: '200ms' }}
          >
            <WalletButton />
          </div>
        </div>
      </div>
      <CurvedDivider color="hsl(267 100% 20%)" flip />
    </section>
  );
};
