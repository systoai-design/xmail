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
      <TechnologySection />
      <CTASection />
      <Footer />
    </div>
  );
};

export default Landing;
