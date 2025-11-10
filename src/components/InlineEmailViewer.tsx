import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/ui/button';
import { X, Lock, Shield, ExternalLink, Loader2, Trash2, Key, Download, Archive } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { decryptMessage, importPrivateKey, decryptAESKey, decryptFile } from '@/lib/encryption';
import { callSecureEndpoint } from '@/lib/secureApi';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { openKeyManagement, onKeyImported } from '@/lib/events';
import { supabase } from '@/integrations/supabase/client';
import JSZip from 'jszip';

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

interface Attachment {
  id: string;
  file_name: string;
  mime_type: string;
  file_size_bytes: number;
  storage_path: string;
  encrypted_symmetric_key: string;
  iv: string;
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
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [decryptedImages, setDecryptedImages] = useState<Record<string, string>>({});
  const [downloadingAttachments, setDownloadingAttachments] = useState<Record<string, boolean>>({});
  const [downloadingAll, setDownloadingAll] = useState(false);

  // Listen for key import events to auto-retry decryption
  useEffect(() => {
    return onKeyImported(() => {
      if (email && missingKey) {
        handleDecrypt(email);
      }
    });
  }, [email, missingKey]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(decryptedImages).forEach(url => URL.revokeObjectURL(url));
    };
  }, [decryptedImages]);

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
      setAttachments(response.attachments || []);

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

      // Decrypt image attachments
      await decryptImageAttachments(privateKey);
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

  const decryptImageAttachments = async (privateKey: CryptoKey) => {
    const imageAttachments = attachments.filter(att => att.mime_type.startsWith('image/'));
    
    for (const attachment of imageAttachments) {
      try {
        // Decrypt the AES key
        const aesKey = await decryptAESKey(attachment.encrypted_symmetric_key, privateKey);
        
        // Download encrypted file from storage
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('email-attachments')
          .download(attachment.storage_path);
        
        if (downloadError || !fileData) {
          console.error('Failed to download attachment:', downloadError);
          continue;
        }
        
        // Decrypt file
        const encryptedBuffer = await fileData.arrayBuffer();
        const decryptedBuffer = await decryptFile(encryptedBuffer, aesKey, attachment.iv);
        
        // Convert to blob and create object URL
        const blob = new Blob([decryptedBuffer], { type: attachment.mime_type });
        const objectUrl = URL.createObjectURL(blob);
        
        setDecryptedImages(prev => ({
          ...prev,
          [attachment.id]: objectUrl
        }));
      } catch (error) {
        console.error('Failed to decrypt attachment:', attachment.file_name, error);
      }
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

  const handleDownloadAttachment = async (attachment: Attachment) => {
    if (!publicKey || !signMessage) return;

    const privateKeyBase64 = sessionStorage.getItem('encryption_private_key');
    if (!privateKeyBase64) {
      toast({
        title: 'Private key missing',
        description: 'Please import your private key to download attachments',
        variant: 'destructive',
      });
      return;
    }

    setDownloadingAttachments(prev => ({ ...prev, [attachment.id]: true }));

    try {
      const privateKey = await importPrivateKey(privateKeyBase64);
      
      // Decrypt the AES key
      const aesKey = await decryptAESKey(attachment.encrypted_symmetric_key, privateKey);
      
      // Download encrypted file from storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('email-attachments')
        .download(attachment.storage_path);
      
      if (downloadError || !fileData) {
        throw new Error('Failed to download attachment');
      }
      
      // Decrypt file
      const encryptedBuffer = await fileData.arrayBuffer();
      const decryptedBuffer = await decryptFile(encryptedBuffer, aesKey, attachment.iv);
      
      // Create blob and trigger download
      const blob = new Blob([decryptedBuffer], { type: attachment.mime_type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Download complete',
        description: `${attachment.file_name} has been downloaded`,
      });
    } catch (error) {
      console.error('Error downloading attachment:', error);
      toast({
        title: 'Download failed',
        description: 'Unable to download and decrypt this attachment',
        variant: 'destructive',
      });
    } finally {
      setDownloadingAttachments(prev => ({ ...prev, [attachment.id]: false }));
    }
  };

  const handleDownloadAllAttachments = async () => {
    if (!publicKey || !signMessage || attachments.length === 0) return;

    const privateKeyBase64 = sessionStorage.getItem('encryption_private_key');
    if (!privateKeyBase64) {
      toast({
        title: 'Private key missing',
        description: 'Please import your private key to download attachments',
        variant: 'destructive',
      });
      return;
    }

    setDownloadingAll(true);

    try {
      const privateKey = await importPrivateKey(privateKeyBase64);
      const zip = new JSZip();

      // Process all attachments
      for (const attachment of attachments) {
        try {
          // Decrypt the AES key
          const aesKey = await decryptAESKey(attachment.encrypted_symmetric_key, privateKey);
          
          // Download encrypted file from storage
          const { data: fileData, error: downloadError } = await supabase.storage
            .from('email-attachments')
            .download(attachment.storage_path);
          
          if (downloadError || !fileData) {
            console.error('Failed to download attachment:', attachment.file_name);
            continue;
          }
          
          // Decrypt file
          const encryptedBuffer = await fileData.arrayBuffer();
          const decryptedBuffer = await decryptFile(encryptedBuffer, aesKey, attachment.iv);
          
          // Add to zip
          zip.file(attachment.file_name, decryptedBuffer);
        } catch (error) {
          console.error('Failed to process attachment:', attachment.file_name, error);
        }
      }

      // Generate zip file
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      
      // Trigger download
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `email-attachments-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Download complete',
        description: `Downloaded ${attachments.length} attachment${attachments.length > 1 ? 's' : ''} as zip file`,
      });
    } catch (error) {
      console.error('Error downloading all attachments:', error);
      toast({
        title: 'Download failed',
        description: 'Unable to download attachments',
        variant: 'destructive',
      });
    } finally {
      setDownloadingAll(false);
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
      {/* Header - Minimal action bar */}
      <div className="border-b border-border px-4 py-2 flex items-center justify-end gap-2">
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {missingKey ? (
          <div className="p-12 text-center space-y-4">
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
          <div className="p-12 flex flex-col items-center justify-center">
            <Loader2 className="w-16 h-16 animate-spin text-primary mb-4" />
            <p className="text-xl font-bold">Decrypting message...</p>
            <p className="text-muted-foreground mt-2 text-sm">This will only take a moment</p>
          </div>
        ) : decryptedSubject && decryptedBody ? (
          <div className="max-w-4xl mx-auto px-8 py-6">
            {/* Subject Line - Prominent */}
            <h1 className="text-2xl font-bold mb-4">
              {decryptedSubject}
            </h1>
            
            {/* Compact Metadata Row */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6 pb-6 border-b border-border">
              <div className="flex items-center gap-1.5 text-xs bg-primary/10 px-2 py-1 rounded">
                <Lock className="w-3 h-3" />
                <span className="font-medium">Encrypted</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-medium">From:</span>
                <span className="font-mono text-xs">
                  {email.from_wallet.slice(0, 6)}...{email.from_wallet.slice(-4)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-medium">To:</span>
                <span className="font-mono text-xs">
                  {email.to_wallet.slice(0, 6)}...{email.to_wallet.slice(-4)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span>{formatDate(email.timestamp)}</span>
              </div>
              {email.payment_tx_signature && (
                <div className="flex items-center gap-1.5">
                  <div className="bg-green-500/10 px-2 py-0.5 rounded text-xs font-medium text-green-500">
                    ✓ Paid
                  </div>
                  {!email.payment_tx_signature.startsWith('mock_') && (
                    <a
                      href={`https://solscan.io/tx/${email.payment_tx_signature}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Email Body - Clean HTML Rendering */}
            <div 
              className="prose-content text-base leading-relaxed"
              dangerouslySetInnerHTML={{ __html: decryptedBody }}
            />

            {/* All Attachments */}
            {attachments.length > 0 && (
              <div className="mt-8 space-y-4">
                <div className="flex items-center justify-between border-t border-border pt-4">
                  <div className="text-sm font-medium text-muted-foreground">
                    Attachments ({attachments.length})
                  </div>
                  {attachments.length > 1 && (
                    <Button
                      onClick={handleDownloadAllAttachments}
                      disabled={downloadingAll}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      {downloadingAll ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Archive className="w-4 h-4" />
                      )}
                      Download All as ZIP
                    </Button>
                  )}
                </div>
                <div className="space-y-3">
                  {attachments.map(attachment => {
                    const isImage = attachment.mime_type.startsWith('image/');
                    return (
                      <div key={attachment.id} className="space-y-2">
                        <div className="flex items-center justify-between gap-2 p-3 bg-muted/50 rounded-lg border border-border">
                          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                            <span className="text-sm text-foreground font-medium truncate">{attachment.file_name}</span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                              {attachment.mime_type.split('/')[1].toUpperCase()}
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
                              {(attachment.file_size_bytes / 1024).toFixed(1)} KB
                            </span>
                          </div>
                          <Button
                            onClick={() => handleDownloadAttachment(attachment)}
                            disabled={downloadingAttachments[attachment.id]}
                            variant="ghost"
                            size="sm"
                            className="gap-2"
                          >
                            {downloadingAttachments[attachment.id] ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                            Download
                          </Button>
                        </div>
                        
                        {/* Show inline preview for images */}
                        {isImage && decryptedImages[attachment.id] && (
                          <img
                            src={decryptedImages[attachment.id]}
                            alt={attachment.file_name}
                            className="rounded-lg border border-border max-w-full h-auto"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-12 text-center">
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
