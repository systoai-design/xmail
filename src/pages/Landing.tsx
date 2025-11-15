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

const Landing = () => {
  const { connected } = useWallet();
  const navigate = useNavigate();

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
      <HowItWorks />
      <FeaturesShowcase />
      <InteractiveDemo />
      
      {/* Live Encryption Playground */}
      <section className="py-20 bg-background relative">
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
      
      <TechnologySection />
      <CTASection />
      <Footer />
    </div>
  );
};

export default Landing;
