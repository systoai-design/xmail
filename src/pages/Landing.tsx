import { useWallet } from '@solana/wallet-adapter-react';
import { WalletButton } from '@/components/WalletButton';
import { Shield, Lock, Zap, Coins } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

const Landing = () => {
  const { connected } = useWallet();
  const navigate = useNavigate();

  useEffect(() => {
    if (connected) {
      navigate('/inbox');
    }
  }, [connected, navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="max-w-4xl w-full text-center space-y-12">
        {/* Hero Section */}
        <div className="space-y-6">
          <h1 className="text-7xl md:text-8xl font-black gradient-primary bg-clip-text text-transparent">
            x402Mail
          </h1>
          <p className="text-3xl font-bold text-foreground">
            Encrypted Email. Powered by Solana.
          </p>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Send wallet-to-wallet encrypted messages with micropayments. 
            Only your recipient can decrypt. No intermediaries. True privacy.
          </p>
        </div>

        {/* Wallet Connect */}
        <div className="flex justify-center">
          <div className="glass p-8 rounded-2xl">
            <WalletButton />
            <p className="mt-4 text-sm text-muted-foreground">
              Connect your Solana wallet to get started
            </p>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-16">
          <div className="glass p-8 rounded-xl hover:scale-105 transition-smooth">
            <Lock className="w-12 h-12 text-primary mb-4 mx-auto" />
            <h3 className="text-2xl font-bold mb-2">End-to-End Encrypted</h3>
            <p className="text-muted-foreground">
              Only your recipient's wallet can decrypt messages. Zero-knowledge encryption.
            </p>
          </div>

          <div className="glass p-8 rounded-xl hover:scale-105 transition-smooth">
            <Coins className="w-12 h-12 text-secondary mb-4 mx-auto" />
            <h3 className="text-2xl font-bold mb-2">Micropayments via x402</h3>
            <p className="text-muted-foreground">
              Pay $0.01 USDC per email. Gasless transactions. Prevents spam.
            </p>
          </div>

          <div className="glass p-8 rounded-xl hover:scale-105 transition-smooth">
            <Shield className="w-12 h-12 text-accent mb-4 mx-auto" />
            <h3 className="text-2xl font-bold mb-2">Wallet = Identity</h3>
            <p className="text-muted-foreground">
              Your Solana wallet is your email address. No accounts. No passwords.
            </p>
          </div>

          <div className="glass p-8 rounded-xl hover:scale-105 transition-smooth">
            <Zap className="w-12 h-12 text-primary mb-4 mx-auto" />
            <h3 className="text-2xl font-bold mb-2">Instant Delivery</h3>
            <p className="text-muted-foreground">
              Lightning-fast Solana blockchain. Messages delivered in seconds.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-sm text-muted-foreground mt-12">
          <p className="flex items-center gap-2 justify-center">
            <Lock className="w-4 h-4" />
            Powered by Solana x402 Protocol
          </p>
        </div>
      </div>
    </div>
  );
};

export default Landing;
