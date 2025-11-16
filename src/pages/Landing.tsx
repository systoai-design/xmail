import { useWallet } from '@solana/wallet-adapter-react';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Header } from '@/components/landing/Header';
import { HeroSection } from '@/components/landing/HeroSection';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { FeaturesShowcase } from '@/components/landing/FeaturesShowcase';
import { InteractiveDemo } from '@/components/landing/InteractiveDemo';
import { TechnologySection } from '@/components/landing/TechnologySection';
import { CTASection } from '@/components/landing/CTASection';
import { Footer } from '@/components/landing/Footer';
import { EncryptionPlayground } from '@/components/landing/EncryptionPlayground';
import { ComparisonTable } from '@/components/landing/ComparisonTable';
import { Shield3D } from '@/components/landing/Shield3D';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

const Landing = () => {
  const { connected } = useWallet();
  const navigate = useNavigate();
  const shieldSection = useScrollAnimation(0.2);
  const comparisonSection = useScrollAnimation(0.2);
  const playgroundSection = useScrollAnimation(0.2);

  useEffect(() => {
    const isFromInbox = sessionStorage.getItem('fromInbox');
    if (connected && !isFromInbox) {
      navigate('/inbox');
    }
    // Clear the flag after checking
    if (isFromInbox) {
      sessionStorage.removeItem('fromInbox');
    }
  }, [connected, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <HeroSection />
      
      {/* 3D Shield Visualization Section */}
      <section 
        ref={shieldSection.ref}
        className={`py-20 bg-background-darker relative overflow-hidden transition-all duration-1000 ${
          shieldSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'
        }`}
      >
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">
              Multi-Layer Encryption
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Your messages are protected by multiple encryption layers. Interact with our shield to see how it works.
            </p>
          </div>
          <Shield3D />
        </div>
      </section>

      <HowItWorks />
      <FeaturesShowcase />
      <InteractiveDemo />
      
      {/* Live Encryption Playground */}
      <section 
        ref={playgroundSection.ref}
        className={`py-20 bg-background relative transition-all duration-1000 ${
          playgroundSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'
        }`}
      >
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">
              Try It Yourself
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              See how your messages are encrypted in real-time. Type anything and watch the magic happen.
            </p>
          </div>
          
          <EncryptionPlayground />
        </div>
      </section>
      
      {/* Comparison Table Section */}
      <section 
        ref={comparisonSection.ref}
        className={`py-20 bg-background-darker relative transition-all duration-1000 ${
          comparisonSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'
        }`}
      >
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">
              Why Choose XMail?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Compare XMail's security features with traditional email providers
            </p>
          </div>
          <div className="max-w-6xl mx-auto glass-card p-6 md:p-8 rounded-2xl border border-primary/20">
            <ComparisonTable />
          </div>
        </div>
      </section>
      
      <TechnologySection />
      <CTASection />
      <Footer />
    </div>
  );
};

export default Landing;
