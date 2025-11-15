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

  useEffect(() => {
    return onKeyImported(() => {
      if (email && missingKey) {
        handleDecrypt(email);
      }
    });
  }, [email, missingKey]);

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
      const response = await callSecureEndpoint('get_email', { emailId }, publicKey, signMessage);
      const data = response.email;

      if (!data) {
        toast({ title: 'Email not found', variant: 'destructive' });
        onClose();
        return;
      }

      setEmail(data);
      setAttachments(response.attachments || []);

      if (data.to_wallet === publicKey.toBase58()) {
        await callSecureEndpoint('mark_read', { emailId }, publicKey, signMessage);
      }

      await handleDecrypt(data);
    } catch (error) {
      console.error('Error loading email:', error);
      toast({ title: 'Error', description: 'Failed to load email', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDecrypt = async (emailData: EmailData) => {
    if (!publicKey) return;

    try {
      setDecrypting(true);
      setMissingKey(false);

      const privateKeyBase64 = localStorage.getItem('encryption_private_key');
      if (!privateKeyBase64) {
        setMissingKey(true);
        setDecrypting(false);
        return;
      }

      const privateKey = await importPrivateKey(privateKeyBase64);
      const isSender = emailData.from_wallet === publicKey.toBase58();

      const subjectToDecrypt = isSender && emailData.sender_encrypted_subject 
        ? emailData.sender_encrypted_subject 
        : emailData.encrypted_subject;
      const bodyToDecrypt = isSender && emailData.sender_encrypted_body 
        ? emailData.sender_encrypted_body 
        : emailData.encrypted_body;

      const [subject, body] = await Promise.all([
        decryptMessage(subjectToDecrypt, privateKey),
        decryptMessage(bodyToDecrypt, privateKey)
      ]);

      setDecryptedSubject(subject);
      setDecryptedBody(body);

      if (attachments.length > 0) {
        await decryptImageAttachments(attachments, privateKey);
      }
    } catch (error) {
      console.error('Error decrypting email:', error);
      toast({ title: 'Decryption failed', variant: 'destructive' });
    } finally {
      setDecrypting(false);
    }
  };

  const decryptImageAttachments = async (attachments: Attachment[], privateKey: CryptoKey) => {
    const imageAttachments = attachments.filter(a => a.mime_type.startsWith('image/'));
    
    for (const attachment of imageAttachments) {
      try {
        const { data: fileData } = await supabase.storage.from('email-attachments').download(attachment.storage_path);
        if (!fileData) continue;

        const symmetricKey = await decryptAESKey(attachment.encrypted_symmetric_key, privateKey);
        const decryptedBlob = await decryptFile(fileData, symmetricKey, attachment.iv);
        const imageUrl = URL.createObjectURL(decryptedBlob);
        
        setDecryptedImages(prev => ({ ...prev, [attachment.id]: imageUrl }));
      } catch (error) {
        console.error('Error decrypting image:', error);
      }
    }
  };

  const handleDelete = async () => {
    if (!publicKey || !signMessage || !email) return;

    setDeleting(true);
    try {
      await callSecureEndpoint('delete_email', { emailId: email.id }, publicKey, signMessage);
      toast({ title: 'Email deleted' });
      onDelete?.();
      onClose();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete email', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  const handleDownloadAttachment = async (attachment: Attachment) => {
    if (!publicKey) return;
    setDownloadingAttachments(prev => ({ ...prev, [attachment.id]: true }));

    try {
      const privateKeyBase64 = localStorage.getItem('encryption_private_key');
      if (!privateKeyBase64) {
        toast({ title: 'Private key required', variant: 'destructive' });
        return;
      }

      const privateKey = await importPrivateKey(privateKeyBase64);
      const { data: fileData } = await supabase.storage.from('email-attachments').download(attachment.storage_path);
      if (!fileData) throw new Error('Failed to download file');

      const symmetricKey = await decryptAESKey(attachment.encrypted_symmetric_key, privateKey);
      const decryptedBlob = await decryptFile(fileData, symmetricKey, attachment.iv);

      const url = URL.createObjectURL(decryptedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ title: 'Download complete' });
    } catch (error) {
      toast({ title: 'Download failed', variant: 'destructive' });
    } finally {
      setDownloadingAttachments(prev => ({ ...prev, [attachment.id]: false }));
    }
  };

  const handleDownloadAllAttachments = async () => {
    if (!publicKey || attachments.length === 0) return;
    setDownloadingAll(true);

    try {
      const privateKeyBase64 = localStorage.getItem('encryption_private_key');
      if (!privateKeyBase64) {
        toast({ title: 'Private key required', variant: 'destructive' });
        return;
      }

      const privateKey = await importPrivateKey(privateKeyBase64);
      const zip = new JSZip();

      for (const attachment of attachments) {
        try {
          const { data: fileData } = await supabase.storage.from('email-attachments').download(attachment.storage_path);
          if (!fileData) continue;

          const symmetricKey = await decryptAESKey(attachment.encrypted_symmetric_key, privateKey);
          const decryptedBlob = await decryptFile(fileData, symmetricKey, attachment.iv);
          zip.file(attachment.file_name, decryptedBlob);
        } catch (error) {
          console.error(`Failed to process ${attachment.file_name}:`, error);
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `email-attachments-${emailId}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ title: 'Download complete' });
    } catch (error) {
      toast({ title: 'Download failed', variant: 'destructive' });
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
    <div className="h-full flex flex-col bg-background">
      <div className="border-b border-border bg-background sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-muted">
            <X className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setShowDeleteDialog(true)} disabled={deleting} className="hover:bg-muted">
            <Trash2 className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-background">
        {missingKey ? (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto px-4">
            <Key className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Private Key Required</h3>
            <p className="text-muted-foreground mb-4">Import your private key to decrypt this message.</p>
            <Button onClick={() => openKeyManagement()} className="gap-2">
              <Key className="w-4 h-4" />
              Import Private Key
            </Button>
          </div>
        ) : decrypting ? (
          <div className="flex flex-col items-center justify-center h-full">
            <Lock className="w-12 h-12 text-primary animate-pulse mb-4" />
            <p className="text-lg font-semibold">Decrypting message...</p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto px-6 py-8">
            <h1 className="text-3xl font-bold mb-6 break-words text-foreground">
              {decryptedSubject || 'Encrypted Message'}
            </h1>

            <div className="flex items-start gap-4 mb-6 pb-6 border-b border-border">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-lg font-medium text-primary">
                  {email.from_wallet.slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-semibold text-foreground truncate">
                    {email.from_wallet.slice(0, 8)}...{email.from_wallet.slice(-6)}
                  </span>
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {formatDate(email.timestamp)}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  to {publicKey?.toBase58().slice(0, 8)}...
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-xs text-primary whitespace-nowrap">
                    <Shield className="w-3 h-3" />
                    <span>Encrypted</span>
                  </div>
                  {email.payment_tx_signature && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-secure/10 text-xs text-emerald-secure whitespace-nowrap">
                      <Lock className="w-3 h-3" />
                      <span>Verified</span>
                    </div>
                  )}
                </div>
                {email.payment_tx_signature && (
                  <a href={`https://solscan.io/tx/${email.payment_tx_signature}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                    View on Solscan
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            <div className="bg-card rounded-lg border border-border shadow-sm p-8 mb-6">
              <div className="prose prose-lg max-w-none dark:prose-invert prose-content" dangerouslySetInnerHTML={{ __html: decryptedBody }} />
            </div>

            {attachments.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">Attachments ({attachments.length})</h3>
                  {attachments.length > 1 && (
                    <Button variant="outline" size="sm" onClick={handleDownloadAllAttachments} disabled={downloadingAll} className="gap-2">
                      {downloadingAll ? <><Loader2 className="w-4 h-4 animate-spin" />Downloading...</> : <><Archive className="w-4 h-4" />Download All</>}
                    </Button>
                  )}
                </div>
                <div className="grid gap-3">
                  {attachments.map((attachment) => {
                    const isImage = attachment.mime_type.startsWith('image/');
                    return (
                      <div key={attachment.id} className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors bg-card">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="text-sm font-medium text-foreground truncate">{attachment.file_name}</div>
                            <div className="text-xs text-muted-foreground whitespace-nowrap">
                              {(attachment.file_size_bytes / 1024).toFixed(1)} KB
                            </div>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => handleDownloadAttachment(attachment)} disabled={downloadingAttachments[attachment.id]} className="gap-2">
                            {downloadingAttachments[attachment.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                            Download
                          </Button>
                        </div>
                        {isImage && decryptedImages[attachment.id] && (
                          <div className="mt-3">
                            <img src={decryptedImages[attachment.id]} alt={attachment.file_name} className="max-w-full h-auto rounded-lg border border-border" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmDeleteDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog} onConfirm={handleDelete} title="Delete Email?" description="This action cannot be undone." confirmText="Delete" isDeleting={deleting} />
    </div>
  );
};
