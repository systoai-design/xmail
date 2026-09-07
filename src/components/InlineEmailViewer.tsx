import { useEffect, useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { Button } from '@/components/ui/button';
import {
  X,
  Lock,
  Shield,
  ExternalLink,
  Loader2,
  Trash2,
  Key,
  Download,
  Archive,
  ArrowLeft,
  Reply,
  Forward,
  Link2,
  Paperclip,
} from 'lucide-react';
import { ACTIVE_CHAIN, explorerTx } from '@/config/chain';
import { messageCommitment, verifyRelayedAnchor } from '@/lib/chainClient';
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
  // Integrity anchor. These are the only fields that can honestly support an
  // on-chain claim; payment_tx_signature says a fee was paid, not that this
  // ciphertext is the one that was sent.
  message_hash: string | null;
  anchor_tx_hash: string | null;
  anchor_block: number | null;
  anchored_at: string | null;
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
  onReply?: (toWallet: string, subject?: string) => void;
  onForward?: (subject: string, body: string, from: string, when: string) => void;
}

export const InlineEmailViewer = ({ emailId, onClose, onDelete, onReply, onForward }: InlineEmailViewerProps) => {
  const { address, signMessage } = useWallet();
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
  // Verification is done live, in front of the reader. A badge that says
  // "verified" because a database column is non-null proves nothing; the point
  // of anchoring is that you do not have to take our word for it.
  const [proof, setProof] = useState<
    | { state: 'idle' }
    | { state: 'checking' }
    | { state: 'ok'; recomputed: string; block: bigint; timestamp: bigint }
    | { state: 'mismatch'; recomputed: string; stored: string }
    | { state: 'absent'; recomputed: string }
    | { state: 'error'; message: string }
  >({ state: 'idle' });

  const runVerification = async () => {
    if (!email) return;
    setProof({ state: 'checking' });
    try {
      // 1. Recompute the commitment from the ciphertext sitting in front of us.
      //    This is what binds the message to its sender and recipient.
      // Wallet addresses are EVM addresses now, so there is nothing to derive.
      const from = email.from_wallet as `0x${string}`;
      const to = email.to_wallet as `0x${string}`;
      const recomputed = messageCommitment(email.encrypted_body, from, to);

      // 2. It must match what was recorded. A mismatch means the stored
      //    ciphertext is not the one that was anchored.
      if (email.message_hash && recomputed.toLowerCase() !== email.message_hash.toLowerCase()) {
        setProof({ state: 'mismatch', recomputed, stored: email.message_hash });
        return;
      }

      // 3. And the chain must actually hold it.
      const { verified, timestamp, blockNumber } = await verifyRelayedAnchor(recomputed, to);
      setProof(
        verified
          ? { state: 'ok', recomputed, block: blockNumber, timestamp }
          : { state: 'absent', recomputed },
      );
    } catch (err) {
      setProof({ state: 'error', message: err instanceof Error ? err.message : 'Chain unreachable' });
    }
  };

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
    if (!emailId || !address || !signMessage) return;

    try {
      const response = await callSecureEndpoint('get_email', { emailId }, address, signMessage);
      const data = response.email;

      if (!data) {
        toast({ title: 'Email not found', variant: 'destructive' });
        onClose();
        return;
      }

      setEmail(data);
      setAttachments(response.attachments || []);

      if (data.to_wallet === address) {
        await callSecureEndpoint('mark_read', { emailId }, address, signMessage);
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
    if (!address) return;

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
      const isSender = emailData.from_wallet === address;

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

        const fileArrayBuffer = await fileData.arrayBuffer();
        const symmetricKey = await decryptAESKey(attachment.encrypted_symmetric_key, privateKey);
        const decryptedArrayBuffer = await decryptFile(fileArrayBuffer, symmetricKey, attachment.iv);
        const decryptedBlob = new Blob([decryptedArrayBuffer], { type: attachment.mime_type });
        const imageUrl = URL.createObjectURL(decryptedBlob);
        
        setDecryptedImages(prev => ({ ...prev, [attachment.id]: imageUrl }));
      } catch (error) {
        console.error('Error decrypting image:', error);
      }
    }
  };

  const handleDelete = async () => {
    if (!address || !signMessage || !email) return;

    setDeleting(true);
    try {
      await callSecureEndpoint('delete_email', { emailId: email.id }, address, signMessage);
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
    if (!address) return;
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

      const fileArrayBuffer = await fileData.arrayBuffer();
      const symmetricKey = await decryptAESKey(attachment.encrypted_symmetric_key, privateKey);
      const decryptedArrayBuffer = await decryptFile(fileArrayBuffer, symmetricKey, attachment.iv);
      const decryptedBlob = new Blob([decryptedArrayBuffer], { type: attachment.mime_type });

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
    if (!address || attachments.length === 0) return;
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

          const fileArrayBuffer = await fileData.arrayBuffer();
          const symmetricKey = await decryptAESKey(attachment.encrypted_symmetric_key, privateKey);
          const decryptedArrayBuffer = await decryptFile(fileArrayBuffer, symmetricKey, attachment.iv);
          const decryptedBlob = new Blob([decryptedArrayBuffer], { type: attachment.mime_type });
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

  const shortAddress = (a: string) => `${a.slice(0, 6)}…${a.slice(-6)}`;

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!email) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-background text-center">
        <h2 className="text-lg">This message could not be loaded</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          It may have been deleted, or it was addressed to a different wallet.
        </p>
        <Button variant="outline" onClick={onClose}>
          Back to inbox
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* --- toolbar ------------------------------------------------------
          A reading pane with only Close and Delete forces you back to the list
          to do the single most common thing in a mail client. */}
      <div className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-1 border-b border-border/70 bg-background px-3">
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Back to list" title="Back to list">
          <ArrowLeft className="h-[18px] w-[18px]" />
        </Button>
        <div className="mx-1 h-5 w-px bg-border" />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onReply?.(email.from_wallet, decryptedSubject)}
          disabled={!onReply}
          aria-label="Reply"
          title="Reply"
        >
          <Reply className="h-[18px] w-[18px]" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() =>
            onForward?.(
              decryptedSubject || 'Encrypted message',
              decryptedBody,
              email.from_wallet,
              formatDate(email.timestamp),
            )
          }
          disabled={!onForward || decrypting || missingKey}
          aria-label="Forward"
          title="Forward"
        >
          <Forward className="h-[18px] w-[18px]" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowDeleteDialog(true)}
          disabled={deleting}
          aria-label="Delete"
          title="Delete"
        >
          {deleting ? (
            <Loader2 className="h-[18px] w-[18px] animate-spin" />
          ) : (
            <Trash2 className="h-[18px] w-[18px]" />
          )}
        </Button>

        <span className="ml-auto text-xs tabular-nums text-muted-foreground">
          {formatDate(email.timestamp)}
        </span>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close" title="Close">
          <X className="h-[18px] w-[18px]" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {missingKey ? (
          <div className="mx-auto flex h-full max-w-md flex-col items-center justify-center px-6 text-center">
            <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
              <Key className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
            </span>
            <h3 className="text-base">Your private key is not on this device</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              This message was encrypted to your key. Import it to read the contents —
              nobody else, including us, can decrypt it for you.
            </p>
            <Button onClick={() => openKeyManagement()} className="mt-6" size="sm">
              <Key className="mr-1.5 h-4 w-4" />
              Import private key
            </Button>
          </div>
        ) : decrypting ? (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <Lock className="h-5 w-5 animate-pulse text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Decrypting in this browser…</p>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl px-8 py-8">
            {/* One weight throughout; size and spacing carry the hierarchy. */}
            <h1 className="text-pretty break-words text-[28px] leading-[1.15] tracking-[-0.022em]">
              {decryptedSubject || 'Encrypted message'}
            </h1>

            <div className="mt-6 flex items-start gap-3 border-b border-border/70 pb-6">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] font-mono text-xs">
                {email.from_wallet.slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-mono text-sm">{shortAddress(email.from_wallet)}</div>
                <div className="mt-0.5 truncate text-xs text-muted-foreground">
                  to {address ? shortAddress(address) : 'you'}
                </div>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] text-muted-foreground">
                <Shield className="h-3 w-3" />
                Encrypted
              </span>
            </div>

            {/* --- integrity anchor -----------------------------------------
                Only ever rendered from real anchor data. The previous version
                showed a "Verified" badge and a Solscan link off
                payment_tx_signature, which proves a fee was paid and says
                nothing about whether this ciphertext is what was sent. */}
            {email.anchor_tx_hash ? (
              <div className="mt-6 rounded-xl border border-[hsl(var(--verified)/0.25)] bg-[hsl(var(--verified)/0.06)] p-4">
                <div className="flex items-center gap-2 text-sm text-[hsl(var(--verified))]">
                  <Link2 className="h-4 w-4" />
                  Anchored on {ACTIVE_CHAIN.name}
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  A hash of this exact ciphertext was written on-chain
                  {email.anchor_block ? ` in block ${email.anchor_block}` : ''}. If a single
                  byte of the message had changed, the hash would not match.
                </p>
                {email.message_hash && (
                  <p className="mt-2 break-all font-mono text-[11px] text-muted-foreground/80">
                    {email.message_hash}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Button size="sm" variant="outline" onClick={runVerification} disabled={proof.state === 'checking'}>
                    {proof.state === 'checking' ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        Checking the chain
                      </>
                    ) : (
                      'Verify against the chain'
                    )}
                  </Button>
                  <a
                    href={explorerTx(email.anchor_tx_hash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs underline underline-offset-4"
                  >
                    Open the transaction
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                {proof.state === 'ok' && (
                  <p className="mt-3 text-xs leading-relaxed text-[hsl(var(--verified))]">
                    Recomputed the hash from this exact ciphertext and found it on
                    {' '}{ACTIVE_CHAIN.name}, recorded{' '}
                    {new Date(Number(proof.timestamp) * 1000).toLocaleString()}. The message
                    has not changed since it was sent.
                  </p>
                )}
                {/* The contract's own block.number is deliberately not shown. On an
                    Arbitrum-style chain that value is an approximate L1 block and
                    does not match the L2 block the explorer displays -- printing
                    both would show two different numbers for one message and read
                    as a bug. The panel above already quotes the explorer's. */}
                {proof.state === 'mismatch' && (
                  <p className="mt-3 text-xs leading-relaxed text-destructive">
                    The stored message does not match what was anchored. Recomputed{' '}
                    <span className="font-mono">{proof.recomputed.slice(0, 18)}…</span>, expected{' '}
                    <span className="font-mono">{proof.stored.slice(0, 18)}…</span>. Treat these
                    contents as untrustworthy.
                  </p>
                )}
                {proof.state === 'absent' && (
                  <p className="mt-3 text-xs leading-relaxed text-[hsl(var(--warning))]">
                    This hash is not on {ACTIVE_CHAIN.name}. The message may have been
                    recorded before anchoring was enabled.
                  </p>
                )}
                {proof.state === 'error' && (
                  <p className="mt-3 text-xs text-muted-foreground">Could not reach the chain: {proof.message}</p>
                )}
              </div>
            ) : (
              <div className="mt-6 rounded-xl border border-border/70 bg-white/[0.02] p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Link2 className="h-4 w-4" />
                  Not anchored on-chain
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  This message is end-to-end encrypted, but no integrity anchor was
                  recorded for it, so there is nothing to verify against.
                </p>
              </div>
            )}

            <div
              className="prose prose-invert prose-content mt-8 max-w-none prose-p:leading-relaxed"
              dangerouslySetInnerHTML={{ __html: decryptedBody }}
            />

            {attachments.length > 0 && (
              <div className="mt-10 border-t border-border/70 pt-6">
                <div className="mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Paperclip className="h-3.5 w-3.5" />
                    {attachments.length} attachment{attachments.length === 1 ? '' : 's'}
                  </span>
                  {attachments.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDownloadAllAttachments}
                      disabled={downloadingAll}
                    >
                      {downloadingAll ? (
                        <>
                          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                          Preparing
                        </>
                      ) : (
                        <>
                          <Archive className="mr-1.5 h-4 w-4" />
                          Download all
                        </>
                      )}
                    </Button>
                  )}
                </div>

                <div className="grid gap-2">
                  {attachments.map((attachment) => {
                    const isImage = attachment.mime_type.startsWith('image/');
                    return (
                      <div
                        key={attachment.id}
                        className="rounded-xl border border-border/70 bg-white/[0.02] p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm">{attachment.file_name}</div>
                            <div className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
                              {(attachment.file_size_bytes / 1024).toFixed(1)} KB · decrypted
                              in your browser
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadAttachment(attachment)}
                            disabled={downloadingAttachments[attachment.id]}
                          >
                            {downloadingAttachments[attachment.id] ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        {isImage && decryptedImages[attachment.id] && (
                          <img
                            src={decryptedImages[attachment.id]}
                            alt={attachment.file_name}
                            className="mt-3 h-auto max-w-full rounded-lg border border-border/70"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-10 flex flex-wrap gap-2">
              {onReply && (
                <Button variant="outline" onClick={() => onReply(email.from_wallet, decryptedSubject)}>
                  <Reply className="mr-2 h-4 w-4" />
                  Reply
                </Button>
              )}
              {onForward && (
                <Button
                  variant="outline"
                  onClick={() =>
                    onForward(
                      decryptedSubject || 'Encrypted message',
                      decryptedBody,
                      email.from_wallet,
                      formatDate(email.timestamp),
                    )
                  }
                >
                  <Forward className="mr-2 h-4 w-4" />
                  Forward
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      <ConfirmDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDelete}
        title="Delete this message?"
        description="It will be removed from your mailbox permanently. Any on-chain anchor stays on-chain."
      />
    </div>
  );
};
