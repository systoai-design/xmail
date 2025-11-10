import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/ui/button';
import { X, Lock, Shield, ExternalLink, Loader2, Trash2, Key } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { decryptMessage, importPrivateKey } from '@/lib/encryption';
import { callSecureEndpoint } from '@/lib/secureApi';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { openKeyManagement, onKeyImported } from '@/lib/events';

interface EmailData {
  id: string;
  from_wallet: string;
  to_wallet: string;
  encrypted_subject: string;
  encrypted_body: string;
  sender_encrypted_subject: string | null;
  sender_encrypted_body: string | null;
  timestamp: string;
  payment_tx_signature: string | null;
  sender_signature: string;
}

interface InlineEmailViewerProps {
  emailId: string;
  onClose: () => void;
  onDelete?: () => void;
}

export const InlineEmailViewer = ({ emailId, onClose, onDelete }: InlineEmailViewerProps) => {
  const { publicKey, signMessage } = useWallet();
  const { toast } = useToast();
  const [email, setEmail] = useState<EmailData | null>(null);
  const [decryptedSubject, setDecryptedSubject] = useState('');
  const [decryptedBody, setDecryptedBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [decrypting, setDecrypting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [missingKey, setMissingKey] = useState(false);

  // Listen for key import events to auto-retry decryption
  useEffect(() => {
    return onKeyImported(() => {
      if (email && missingKey) {
        handleDecrypt(email);
      }
    });
  }, [email, missingKey]);

  useEffect(() => {
    loadEmail();
  }, [emailId]);

  const loadEmail = async () => {
    if (!emailId || !publicKey || !signMessage) return;

    try {
      const response = await callSecureEndpoint(
        'get_email',
        { emailId },
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
        onClose();
        return;
      }

      setEmail(data);

      // Mark as read if user is recipient
      if (data.to_wallet === publicKey.toBase58()) {
        await callSecureEndpoint(
          'mark_read',
          { emailId },
          publicKey,
          signMessage
        );
      }

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
    if (!publicKey || !signMessage) return;

    const privateKeyBase64 = sessionStorage.getItem('encryption_private_key');

    if (!privateKeyBase64) {
      setMissingKey(true);
      return;
    }

    setMissingKey(false);
    setDecrypting(true);

    try {

      const privateKey = await importPrivateKey(privateKeyBase64);

      // Determine if user is sender or recipient
      const isSender = emailData.from_wallet === publicKey.toBase58();

      let subject: string;
      let body: string;

      if (isSender && emailData.sender_encrypted_subject && emailData.sender_encrypted_body) {
        // Decrypt using sender's copy
        subject = await decryptMessage(emailData.sender_encrypted_subject, privateKey);
        body = await decryptMessage(emailData.sender_encrypted_body, privateKey);
      } else {
        // Decrypt using recipient's copy
        subject = await decryptMessage(emailData.encrypted_subject, privateKey);
        body = await decryptMessage(emailData.encrypted_body, privateKey);
      }

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
    if (!publicKey || !signMessage || !emailId) return;

    setDeleting(true);
    try {
      await callSecureEndpoint(
        'delete_email',
        { emailId },
        publicKey,
        signMessage
      );

      toast({
        title: 'Email deleted',
        description: 'The email has been permanently deleted',
      });

      onDelete?.();
      onClose();
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
      <div className="flex-1 flex items-center justify-center bg-background">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!email) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Email not found</h2>
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background border-l border-border">
      {/* Header */}
      <div className="border-b border-border p-4 flex items-center justify-between bg-muted/30">
        <h2 className="font-semibold truncate flex-1">
          {decryptedSubject || 'Encrypted Message'}
        </h2>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowDeleteDialog(true)}
            variant="ghost"
            size="icon"
            disabled={deleting}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Email Metadata */}
        <div className="glass p-6 rounded-xl border border-border/50 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent/20 to-accent/40 flex items-center justify-center">
              <Shield className="w-5 h-5 text-accent" />
            </div>
            <div className="flex-1">
              <div className="text-lg font-bold text-accent flex items-center gap-2">
                🔒 Verified & Encrypted
              </div>
              <div className="text-xs text-muted-foreground">End-to-end encrypted message</div>
            </div>
            {email.payment_tx_signature && (
              <div className="flex items-center gap-2">
                <div className="bg-green-500/10 px-3 py-1 rounded-lg text-sm font-semibold text-green-500 border border-green-500/20">
                  ✓ Paid
                </div>
                {!email.payment_tx_signature.startsWith('mock_') && (
                  <a
                    href={`https://solscan.io/tx/${email.payment_tx_signature}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-secondary/80 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-muted-foreground">From:</span>
              <span className="font-mono bg-muted/50 px-2 py-0.5 rounded">
                {email.from_wallet.slice(0, 8)}...{email.from_wallet.slice(-8)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-muted-foreground">To:</span>
              <span className="font-mono bg-muted/50 px-2 py-0.5 rounded">
                {email.to_wallet.slice(0, 8)}...{email.to_wallet.slice(-8)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-muted-foreground">Date:</span>
              <span>{formatDate(email.timestamp)}</span>
            </div>
          </div>
        </div>

        {/* Email Content */}
        {missingKey ? (
          <div className="glass p-12 rounded-xl text-center border border-border/50 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Key className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Private Key Missing</h3>
              <p className="text-muted-foreground text-sm">
                Your private decryption key is not available on this device. Import it from another device to read this message.
              </p>
            </div>
            <Button onClick={() => openKeyManagement()} className="gap-2">
              <Key className="w-4 h-4" />
              Restore Key
            </Button>
          </div>
        ) : decrypting ? (
          <div className="glass p-12 rounded-xl flex flex-col items-center justify-center border border-border/50">
            <Loader2 className="w-16 h-16 animate-spin text-primary mb-4" />
            <p className="text-xl font-bold">Decrypting message...</p>
            <p className="text-muted-foreground mt-2 text-sm">This will only take a moment</p>
          </div>
        ) : decryptedSubject && decryptedBody ? (
          <div className="glass p-8 rounded-xl space-y-6 border border-border/50">
            <div className="border-b border-border/50 pb-4">
              <h1 className="text-3xl font-bold leading-tight">
                {decryptedSubject}
              </h1>
            </div>
            <div className="prose prose-lg max-w-none dark:prose-invert">
              <div className="text-base leading-relaxed whitespace-pre-wrap">
                {decryptedBody}
              </div>
            </div>
          </div>
        ) : (
          <div className="glass p-12 rounded-xl text-center border border-border/50">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Encrypted Message</h3>
            <p className="text-muted-foreground">
              Unable to decrypt. Please make sure you're using the correct wallet.
            </p>
          </div>
        )}
      </div>

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
