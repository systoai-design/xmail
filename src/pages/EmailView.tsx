import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Lock, Shield, ExternalLink, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { decryptMessage, importPrivateKey } from '@/lib/encryption';
import { callSecureEndpoint } from '@/lib/secureApi';

interface EmailData {
  id: string;
  from_wallet: string;
  to_wallet: string;
  encrypted_subject: string;
  encrypted_body: string;
  timestamp: string;
  payment_tx_signature: string | null;
  sender_signature: string;
}

const EmailView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { publicKey, signMessage } = useWallet();
  const { toast } = useToast();
  const [email, setEmail] = useState<EmailData | null>(null);
  const [decryptedSubject, setDecryptedSubject] = useState('');
  const [decryptedBody, setDecryptedBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [decrypting, setDecrypting] = useState(false);

  useEffect(() => {
    loadEmail();
  }, [id]);

  const loadEmail = async () => {
    if (!id || !publicKey || !signMessage) return;

    try {
      const response = await callSecureEndpoint(
        'get_email',
        { emailId: id },
        publicKey,
        signMessage
      );

      const data = response.email;

      if (!data) {
        toast({
          title: 'Email not found',
          description: 'This email does not exist or you do not have access',
          variant: 'destructive',
        });
        navigate('/inbox');
        return;
      }
      
      if (data.to_wallet !== publicKey.toBase58()) {
        toast({
          title: 'Access Denied',
          description: 'This email is not addressed to your wallet',
          variant: 'destructive',
        });
        navigate('/inbox');
        return;
      }

      setEmail(data);
      
      // Mark as read
      await callSecureEndpoint(
        'mark_read',
        { emailId: id },
        publicKey,
        signMessage
      );

      // Auto-decrypt
      await handleDecrypt(data);
    } catch (error) {
      console.error('Error loading email:', error);
      toast({
        title: 'Error',
        description: 'Failed to load email',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDecrypt = async (emailData: EmailData) => {
    if (!signMessage) return;

    setDecrypting(true);

    try {
      // Get private key from session storage (in production, derive from wallet signature)
      const privateKeyBase64 = sessionStorage.getItem('encryption_private_key');
      
      if (!privateKeyBase64) {
        toast({
          title: 'Decryption key not found',
          description: 'Please reconnect your wallet to generate decryption keys',
          variant: 'destructive',
        });
        return;
      }

      const privateKey = await importPrivateKey(privateKeyBase64);

      // Decrypt subject and body
      const subject = await decryptMessage(emailData.encrypted_subject, privateKey);
      const body = await decryptMessage(emailData.encrypted_body, privateKey);

      setDecryptedSubject(subject);
      setDecryptedBody(body);
    } catch (error) {
      console.error('Error decrypting:', error);
      toast({
        title: 'Decryption failed',
        description: 'Unable to decrypt this message. Make sure you are using the correct wallet.',
        variant: 'destructive',
      });
    } finally {
      setDecrypting(false);
    }
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!email) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4">Email not found</h2>
          <Button onClick={() => navigate('/inbox')}>Back to Inbox</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="glass border-b border-border">
        <div className="container mx-auto px-6 py-4">
          <Button
            onClick={() => navigate('/inbox')}
            variant="ghost"
            size="lg"
            className="font-bold"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Inbox
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8 max-w-4xl">
        {/* Email Metadata */}
        <div className="glass p-6 rounded-xl mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-accent" />
              <div className="text-xl font-bold text-accent">
                🔒 Verified & Encrypted
              </div>
            </div>
            {email.payment_tx_signature && (
              <div className="flex items-center gap-2 text-sm text-secondary">
                <div className="bg-secondary/20 px-4 py-2 rounded-full font-bold">
                  ✓ Payment Verified
                </div>
                {email.payment_tx_signature.startsWith('mock_') ? (
                  <div className="text-xs text-muted-foreground">(Demo Mode)</div>
                ) : (
                  <a
                    href={`https://solscan.io/tx/${email.payment_tx_signature}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-secondary/80"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            )}
          </div>
          <div className="space-y-2 text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="font-bold">From:</span>
              <span className="font-mono text-sm">
                {email.from_wallet.slice(0, 12)}...{email.from_wallet.slice(-12)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold">Date:</span>
              <span>{formatDate(email.timestamp)}</span>
            </div>
          </div>
        </div>

        {/* Email Content */}
        {decrypting ? (
          <div className="glass p-12 rounded-2xl flex flex-col items-center justify-center">
            <Loader2 className="w-16 h-16 animate-spin text-primary mb-4" />
            <p className="text-xl font-bold">Decrypting message...</p>
          </div>
        ) : decryptedSubject && decryptedBody ? (
          <div className="glass p-8 rounded-2xl space-y-6">
            <div>
              <h1 className="text-5xl font-black mb-2">{decryptedSubject}</h1>
            </div>
            <div className="border-t border-border pt-6">
              <div className="text-xl leading-relaxed whitespace-pre-wrap">
                {decryptedBody}
              </div>
            </div>
          </div>
        ) : (
          <div className="glass p-12 rounded-2xl text-center">
            <Lock className="w-16 h-16 text-primary mx-auto mb-4" />
            <h3 className="text-3xl font-bold mb-2">Encrypted Message</h3>
            <p className="text-muted-foreground">
              Unable to decrypt. Please make sure you're using the correct wallet.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default EmailView;
