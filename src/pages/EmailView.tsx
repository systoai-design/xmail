import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Lock, Shield, ExternalLink, Loader2, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { decryptMessage, importPrivateKey } from '@/lib/encryption';
import { callSecureEndpoint } from '@/lib/secureApi';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';

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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  const handleDelete = async () => {
    if (!publicKey || !signMessage || !id) return;

    setDeleting(true);
    try {
      await callSecureEndpoint(
        'delete_email',
        { emailId: id },
        publicKey,
        signMessage
      );
      
      toast({
        title: 'Email deleted',
        description: 'The email has been permanently deleted',
      });
      
      navigate('/inbox');
    } catch (error) {
      console.error('Error deleting email:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete email',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="glass border-b border-border/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Button
            onClick={() => navigate('/inbox')}
            variant="ghost"
            size="lg"
            className="font-bold hover:scale-105 transition-transform"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Inbox
          </Button>
          
          <Button
            onClick={() => setShowDeleteDialog(true)}
            variant="destructive"
            size="lg"
            disabled={deleting}
            className="hover:scale-105 transition-transform"
          >
            {deleting ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <Trash2 className="w-5 h-5 mr-2" />
            )}
            Delete
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12 max-w-4xl">
        {/* Email Metadata */}
        <div className="glass p-8 rounded-2xl mb-8 border-2 border-primary/20 bg-gradient-to-br from-background to-primary/5">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent/20 to-accent/40 flex items-center justify-center">
                <Shield className="w-7 h-7 text-accent" />
              </div>
              <div>
                <div className="text-2xl font-bold text-accent flex items-center gap-2">
                  🔒 Verified & Encrypted
                </div>
                <div className="text-sm text-muted-foreground">End-to-end encrypted message</div>
              </div>
            </div>
            {email.payment_tx_signature && (
              <div className="flex items-center gap-3">
                <div className="bg-green-500/10 px-4 py-2 rounded-xl font-bold text-green-500 border border-green-500/20">
                  ✓ Payment Verified
                </div>
                {!email.payment_tx_signature.startsWith('mock_') && (
                  <a
                    href={`https://solscan.io/tx/${email.payment_tx_signature}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-secondary/80 transition-colors"
                  >
                    <ExternalLink className="w-5 h-5" />
                  </a>
                )}
              </div>
            )}
          </div>
          
          <div className="space-y-3 text-base">
            <div className="flex items-center gap-3">
              <span className="font-bold text-foreground">From:</span>
              <span className="font-mono bg-muted/50 px-3 py-1 rounded-lg">
                {email.from_wallet.slice(0, 12)}...{email.from_wallet.slice(-12)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-bold text-foreground">Date:</span>
              <span className="text-muted-foreground">{formatDate(email.timestamp)}</span>
            </div>
          </div>
        </div>

        {/* Email Content */}
        {decrypting ? (
          <div className="glass p-16 rounded-2xl flex flex-col items-center justify-center border border-border/50">
            <Loader2 className="w-20 h-20 animate-spin text-primary mb-6" />
            <p className="text-2xl font-bold">Decrypting message...</p>
            <p className="text-muted-foreground mt-2">This will only take a moment</p>
          </div>
        ) : decryptedSubject && decryptedBody ? (
          <div className="glass p-10 rounded-2xl space-y-8 border border-border/50">
            <div className="border-b border-border/50 pb-6">
              <h1 className="text-5xl font-black leading-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                {decryptedSubject}
              </h1>
            </div>
            <div className="prose prose-lg max-w-none">
              <div className="text-xl leading-relaxed whitespace-pre-wrap text-foreground/90">
                {decryptedBody}
              </div>
            </div>
          </div>
        ) : (
          <div className="glass p-16 rounded-2xl text-center border border-border/50">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Lock className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-3xl font-bold mb-3">Encrypted Message</h3>
            <p className="text-lg text-muted-foreground">
              Unable to decrypt. Please make sure you're using the correct wallet.
            </p>
          </div>
        )}
      </main>

      {/* Delete Confirmation Dialog */}
      <ConfirmDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDelete}
        title="Delete Email?"
        description="This will permanently delete this email. This action cannot be undone."
      />
    </div>
  );
};

export default EmailView;
