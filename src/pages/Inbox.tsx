import { useWallet } from '@solana/wallet-adapter-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Mail, Lock, Plus, LogOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useEncryptionKeys } from '@/hooks/useEncryptionKeys';

interface EncryptedEmail {
  id: string;
  from_wallet: string;
  encrypted_subject: string;
  encrypted_body: string;
  timestamp: string;
  read: boolean;
  payment_tx_signature: string | null;
}

const Inbox = () => {
  const { connected, publicKey, disconnect } = useWallet();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { keysReady } = useEncryptionKeys();
  const [emails, setEmails] = useState<EncryptedEmail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!connected) {
      navigate('/');
      return;
    }
    if (keysReady) {
      loadEmails();
    }
  }, [connected, navigate, publicKey, keysReady]);

  const loadEmails = async () => {
    if (!publicKey) return;

    try {
      const { data, error } = await supabase
        .from('encrypted_emails')
        .select('*')
        .eq('to_wallet', publicKey.toBase58())
        .order('timestamp', { ascending: false });

      if (error) throw error;
      setEmails(data || []);
    } catch (error) {
      console.error('Error loading emails:', error);
      toast({
        title: 'Error',
        description: 'Failed to load emails',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    navigate('/');
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="glass border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-4xl font-black gradient-primary bg-clip-text text-transparent">
              xmail
            </h1>
            {publicKey && (
              <div className="text-sm text-muted-foreground font-mono">
                {publicKey.toBase58().slice(0, 6)}...{publicKey.toBase58().slice(-6)}
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate('/compose')}
              size="lg"
              className="font-bold text-lg shadow-glow"
            >
              <Plus className="w-5 h-5 mr-2" />
              New Email
            </Button>
            <Button
              onClick={handleDisconnect}
              variant="outline"
              size="lg"
            >
              <LogOut className="w-5 h-5 mr-2" />
              Disconnect
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-5xl font-black mb-2">Inbox</h2>
          <p className="text-xl text-muted-foreground">
            {emails.length} encrypted {emails.length === 1 ? 'message' : 'messages'}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
          </div>
        ) : emails.length === 0 ? (
          <div className="text-center py-20">
            <Mail className="w-24 h-24 text-muted-foreground mx-auto mb-6" />
            <h3 className="text-3xl font-bold mb-2">No messages yet</h3>
            <p className="text-xl text-muted-foreground mb-8">
              Send your first encrypted email to get started
            </p>
            <Button
              onClick={() => navigate('/compose')}
              size="lg"
              className="font-bold text-lg shadow-glow"
            >
              <Plus className="w-5 h-5 mr-2" />
              Compose Email
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {emails.map((email) => (
              <div
                key={email.id}
                onClick={() => navigate(`/email/${email.id}`)}
                className="glass p-6 rounded-xl hover:scale-[1.02] transition-smooth cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                      <Mail className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <div className="font-mono text-sm text-muted-foreground">
                        From: {email.from_wallet.slice(0, 8)}...{email.from_wallet.slice(-8)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(email.timestamp)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {email.payment_tx_signature && (
                      <div className="text-xs bg-accent/20 text-accent px-3 py-1 rounded-full font-bold">
                        ✓ Paid
                      </div>
                    )}
                    <Lock className="w-5 h-5 text-primary" />
                  </div>
                </div>
                <div className="text-2xl font-bold mb-2 flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  Encrypted Message
                </div>
                <p className="text-muted-foreground">
                  Click to decrypt and read
                </p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Inbox;
