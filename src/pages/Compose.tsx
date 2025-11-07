import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Lock, Loader2, DollarSign, Shield } from 'lucide-react';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { encryptMessage, importPublicKey } from '@/lib/encryption';
import { PublicKey } from '@solana/web3.js';
import { useEncryptionKeys } from '@/hooks/useEncryptionKeys';
import { isAdmin } from '@/lib/userRoles';
import { callSecureEndpoint } from '@/lib/secureApi';

const Compose = () => {
  const { publicKey, signMessage } = useWallet();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { keysReady } = useEncryptionKeys();
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [userIsAdmin, setUserIsAdmin] = useState(false);

  // Check admin status on mount
  useEffect(() => {
    if (publicKey) {
      isAdmin(publicKey.toBase58()).then(setUserIsAdmin);
    }
  }, [publicKey]);

  const handleSend = async () => {
    if (!publicKey || !signMessage) {
      toast({
        title: 'Wallet not connected',
        description: 'Please connect your wallet first',
        variant: 'destructive',
      });
      return;
    }

    if (!to || !subject || !body) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    // Trim and validate recipient address
    const recipient = to.trim();
    
    try {
      new PublicKey(recipient);
    } catch {
      toast({
        title: 'Invalid wallet address',
        description: 'Please enter a valid Solana wallet address',
        variant: 'destructive',
      });
      return;
    }

    setSending(true);

    try {
      // Check if we have recipient's public key
      const { data: recipientKeyData, error: lookupError } = await supabase
        .from('encryption_keys')
        .select('public_key')
        .eq('wallet_address', recipient)
        .maybeSingle();

      if (lookupError) {
        console.error('Error looking up recipient:', lookupError);
        toast({
          title: 'Recipient lookup failed',
          description: 'Could not verify recipient registration. Please try again.',
          variant: 'destructive',
        });
        setSending(false);
        return;
      }

      if (!recipientKeyData) {
        toast({
          title: 'Recipient not registered',
          description: 'Recipient must connect their wallet first to receive encrypted emails',
          variant: 'destructive',
        });
        setSending(false);
        return;
      }

      const recipientPublicKey = await importPublicKey(recipientKeyData.public_key);

      // Encrypt subject and body
      const encryptedSubject = await encryptMessage(subject, recipientPublicKey);
      const encryptedBody = await encryptMessage(body, recipientPublicKey);

      // Sign the message for authenticity
      const message = new TextEncoder().encode(`${subject}${body}`);
      const signature = await signMessage(message);
      const signatureBase64 = btoa(String.fromCharCode(...signature));

      // Admin users bypass payment requirement
      const mockPaymentTx = userIsAdmin ? 'admin_exempt_' + Math.random().toString(36).substring(7) : 'mock_' + Math.random().toString(36).substring(7);

      // Store encrypted email using secure endpoint
      await callSecureEndpoint(
        'send_email',
        {
          from_wallet: publicKey.toBase58(),
          to_wallet: recipient,
          encrypted_subject: encryptedSubject,
          encrypted_body: encryptedBody,
          sender_signature: signatureBase64,
          payment_tx_signature: mockPaymentTx,
        },
        publicKey,
        signMessage
      );

      toast({
        title: 'Email sent!',
        description: 'Your encrypted email has been delivered',
      });

      navigate('/inbox');
    } catch (error) {
      console.error('Error sending email:', error);
      toast({
        title: 'Error',
        description: 'Failed to send email',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

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
        <div className="mb-8">
          <h1 className="text-6xl font-black mb-2">New Encrypted Message</h1>
          <p className="text-xl text-muted-foreground flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Only the recipient can decrypt this message
          </p>
        </div>

        <div className="glass p-8 rounded-2xl space-y-6">
          <div className="space-y-2">
            <Label htmlFor="to" className="text-xl font-bold">
              To (Wallet Address)
            </Label>
            <Input
              id="to"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="Enter recipient's Solana wallet address"
              className="h-14 text-lg font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject" className="text-xl font-bold">
              Subject
            </Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter subject"
              className="h-14 text-lg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body" className="text-xl font-bold">
              Message
            </Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your encrypted message..."
              className="min-h-[300px] text-lg"
            />
          </div>

          {/* Admin Badge or Payment Preview */}
          {userIsAdmin ? (
            <div className="glass p-6 rounded-xl border-2 border-accent/30">
              <div className="flex items-center justify-center gap-3">
                <Shield className="w-8 h-8 text-accent" />
                <div className="text-xl font-bold text-accent">
                  Admin Access - No Payment Required
                </div>
              </div>
            </div>
          ) : (
            <div className="glass p-6 rounded-xl border-2 border-primary/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <DollarSign className="w-8 h-8 text-secondary" />
                  <div>
                    <div className="text-lg font-bold">Payment Required</div>
                    <div className="text-sm text-muted-foreground">
                      xmail Protocol • Gasless Transaction
                    </div>
                  </div>
                </div>
                <div className="text-3xl font-black text-secondary">
                  $0.01 USDC
                </div>
              </div>
            </div>
          )}

          <Button
            onClick={handleSend}
            disabled={sending}
            size="lg"
            className="w-full h-16 text-2xl font-black shadow-glow"
          >
            {sending ? (
              <>
                <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                Encrypting & Sending...
              </>
            ) : (
              <>
                <Lock className="w-6 h-6 mr-3" />
                Encrypt & Send
              </>
            )}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Your message will be encrypted end-to-end. Only the recipient's wallet can decrypt it.
          </p>
        </div>
      </main>
    </div>
  );
};

export default Compose;
