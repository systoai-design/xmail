import { useState, useEffect, useRef, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  X, 
  Minus, 
  Maximize2, 
  Lock, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Send,
  Paperclip,
  Upload,
  Clock
} from 'lucide-react';
import { AttachmentUpload, AttachmentUploadHandle } from '@/components/AttachmentUpload';
import { ACCEPTED_SUMMARY } from '@/lib/attachmentTypes';
import { creditCost, ciphertextBytes, describeCost } from '@/lib/credits';
import { ContactAutocomplete } from '@/components/ContactAutocomplete';
import { RichTextEditor } from '@/components/RichTextEditor';
import { ScheduleSelector } from '@/components/ScheduleSelector';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { encryptMessage, decryptMessage, importPublicKey, importPrivateKey } from '@/lib/encryption';
import { PublicKey } from '@solana/web3.js';
import { useEncryptionKeys } from '@/hooks/useEncryptionKeys';
import { isAdmin } from '@/lib/userRoles';
import { callSecureEndpoint } from '@/lib/secureApi';
import { emitCreditsChanged, emitMailChanged } from '@/lib/events';
import { scheduleSend, UNDO_WINDOW_MS } from '@/lib/pendingSend';
import { ToastAction } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  draftId?: string | null;
  /** Pre-filled fields. Set when opened as a reply or a forward. */
  initialTo?: string;
  initialSubject?: string;
  initialBody?: string;
  onSent?: () => void;
  onSubjectChange?: (subject: string) => void;
  /** Fired with the new balance after a send, so the sidebar updates at once. */
  onCreditsChanged?: (balance: number | undefined) => void;
}

export const ComposeModal = ({ isOpen, onClose, draftId, initialTo, initialSubject, initialBody, onSent, onSubjectChange, onCreditsChanged }: ComposeModalProps) => {
  const { publicKey, signMessage } = useWallet();
  const { toast } = useToast();
  const { keysReady } = useEncryptionKeys();
  
  // Seeded once, not synced: after this the field belongs to the user, and a
  // prop-driven reset would wipe a recipient they had just corrected.
  const [to, setTo] = useState(initialTo ?? '');
  const [subject, setSubject] = useState(initialSubject ?? '');
  const [body, setBody] = useState(initialBody ?? '');
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid' | 'not-registered'>('idle');
  const [validationMessage, setValidationMessage] = useState('');
  const [userIsAdmin, setUserIsAdmin] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(draftId || null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showScheduleSelector, setShowScheduleSelector] = useState(false);
  const [closing, setClosing] = useState(false);
  const [attachmentCount, setAttachmentCount] = useState(0);
  const autoSaveTimerRef = useRef<NodeJS.Timeout>();
  const attachRef = useRef<AttachmentUploadHandle>(null);

  // Check admin status
  useEffect(() => {
    if (publicKey) {
      isAdmin(publicKey.toBase58()).then(setUserIsAdmin);
    }
  }, [publicKey]);

  // Load draft if provided
  useEffect(() => {
    const loadDraft = async () => {
      if (!draftId || !publicKey || !signMessage || !keysReady) return;

      const privateKeyBase64 = localStorage.getItem('encryption_private_key');
      if (!privateKeyBase64) {
        toast({
          title: 'Cannot load draft',
          description: 'Private key not found',
          variant: 'destructive',
        });
        return;
      }

      try {
        const response = await callSecureEndpoint(
          'get_draft',
          { draftId },
          publicKey,
          signMessage
        );

        if (response.draft) {
          const { to_wallet, encrypted_subject, encrypted_body } = response.draft;
          setTo(to_wallet || '');
          
          // Was hand-rolled raw RSA, which cannot read the hybrid envelope that
          // drafts are now saved in. decryptMessage handles both formats.
          const privateKey = await importPrivateKey(privateKeyBase64);

          if (encrypted_subject) {
            setSubject(await decryptMessage(encrypted_subject, privateKey));
          }
          
          if (encrypted_body) {
            setBody(await decryptMessage(encrypted_body, privateKey));
          }
          
          setCurrentDraftId(draftId);
        }
      } catch (error) {
        console.error('Error loading draft:', error);
        toast({
          title: 'Error',
          description: 'Failed to load draft',
          variant: 'destructive',
        });
      }
    };

    loadDraft();
  }, [draftId, publicKey, signMessage, keysReady, toast]);

  // Notify parent of subject changes
  useEffect(() => {
    onSubjectChange?.(subject);
  }, [subject, onSubjectChange]);

  // Auto-save draft
  const saveDraft = useCallback(async (showToast = false, force = false): Promise<string | null> => {
    if (!publicKey || !signMessage || !keysReady) return null;
    // An attachment has to hang off a draft row, so attaching to an untouched
    // compose still needs one created. Without `force` this returned the null
    // currentDraftId and the first attachment always failed with
    // "Could not create draft for attachment".
    if (!force && !to && !subject && !body) return currentDraftId;

    setSaving(true);
    try {
      const { data: ownKeyData } = await supabase
        .from('encryption_keys')
        .select('public_key')
        .eq('wallet_address', publicKey.toBase58())
        .single();

      if (!ownKeyData) {
        // Silent before: a wallet with no registered key produced a null return
        // and no explanation, which looked exactly like a save that worked.
        if (showToast || force) {
          toast({
            title: 'Draft not saved',
            description: 'No encryption key is registered for this wallet yet.',
            variant: 'destructive',
          });
        }
        return null;
      }

      const ownPublicKey = await importPublicKey(ownKeyData.public_key);
      const encryptedSubject = subject ? await encryptMessage(subject, ownPublicKey) : '';
      const encryptedBody = body ? await encryptMessage(body, ownPublicKey) : '';

      const response = await callSecureEndpoint(
        'save_draft',
        {
          draftId: currentDraftId,
          to_wallet: to || null,
          encrypted_subject: encryptedSubject,
          encrypted_body: encryptedBody,
        },
        publicKey,
        signMessage
      );

      const draftId = response.draftId || currentDraftId;
      if (response.draftId && !currentDraftId) {
        setCurrentDraftId(response.draftId);
      }

      setLastSaved(new Date());
      if (showToast) {
        toast({
          title: 'Draft saved',
          description: 'Your message has been saved',
        });
      }
      return draftId;
    } catch (error) {
      console.error('Error saving draft:', error);
      if (showToast) {
        toast({
          title: 'Error',
          description: 'Failed to save draft',
          variant: 'destructive',
        });
      }
      return null;
    } finally {
      setSaving(false);
    }
  }, [publicKey, signMessage, keysReady, to, subject, body, currentDraftId, toast]);

  // Auto-save timer
  useEffect(() => {
    if (!isOpen) return;
    
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      saveDraft(false);
    }, 10000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [to, subject, body, saveDraft, isOpen]);

  // Recipient validation
  useEffect(() => {
    const validateRecipient = async (address: string) => {
      const trimmed = address.trim();
      
      if (!trimmed) {
        setValidationStatus('idle');
        setValidationMessage('');
        return;
      }
      
      setValidationStatus('checking');
      
      try {
        new PublicKey(trimmed);
        
        const { data, error } = await supabase
          .from('encryption_keys')
          .select('public_key')
          .eq('wallet_address', trimmed)
          .maybeSingle();
        
        if (error) {
          setValidationStatus('invalid');
          setValidationMessage('Error checking recipient');
          return;
        }
        
        if (data) {
          setValidationStatus('valid');
          setValidationMessage('✓ Recipient ready');
        } else {
          setValidationStatus('not-registered');
          setValidationMessage('⚠ Recipient not registered');
        }
      } catch {
        setValidationStatus('invalid');
        setValidationMessage('✗ Invalid address');
      }
    };

    const timer = setTimeout(() => {
      if (to) validateRecipient(to);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [to]);

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
      const { data: recipientKeyData, error: lookupError } = await supabase
        .from('encryption_keys')
        .select('public_key')
        .eq('wallet_address', recipient)
        .maybeSingle();

      if (lookupError) {
        toast({
          title: 'Recipient lookup failed',
          description: 'Could not verify recipient registration',
          variant: 'destructive',
        });
        setSending(false);
        return;
      }

      if (!recipientKeyData) {
        // Park it. There is no recipient key to encrypt to yet, so the message
        // is sealed to us and re-sealed to them when they register.
        const { data: ownKey } = await supabase
          .from('encryption_keys')
          .select('public_key')
          .eq('wallet_address', publicKey.toBase58())
          .single();

        if (!ownKey) {
          toast({
            title: 'Cannot park message',
            description: 'No encryption key is registered for this wallet yet.',
            variant: 'destructive',
          });
          setSending(false);
          return;
        }

        const ownPub = await importPublicKey(ownKey.public_key);
        await callSecureEndpoint(
          'park_email',
          {
            from_wallet: publicKey.toBase58(),
            to_wallet: recipient,
            sender_encrypted_subject: await encryptMessage(subject, ownPub),
            sender_encrypted_body: await encryptMessage(body, ownPub),
          },
          publicKey,
          signMessage
        );

        if (currentDraftId) {
          try {
            await callSecureEndpoint('delete_draft', { draftId: currentDraftId }, publicKey, signMessage);
          } catch (err) {
            console.error('Error deleting draft:', err);
          }
        }

        toast({
          title: 'Message parked',
          description:
            'They have not registered a key yet. It will be sent automatically the next time you open xmail after they do — and no credits are charged until then.',
        });

        setTo('');
        setSubject('');
        setBody('');
        setCurrentDraftId(null);
        setSending(false);
        onSent?.();
        onClose();
        return;
      }

      // Encrypt for recipient
      const recipientPublicKey = await importPublicKey(recipientKeyData.public_key);
      const encryptedSubject = await encryptMessage(subject, recipientPublicKey);
      const encryptedBody = await encryptMessage(body, recipientPublicKey);

      // Also encrypt for sender so they can read their sent emails
      const { data: senderKeyData } = await supabase
        .from('encryption_keys')
        .select('public_key')
        .eq('wallet_address', publicKey.toBase58())
        .single();

      const senderPublicKey = await importPublicKey(senderKeyData.public_key);
      const senderEncryptedSubject = await encryptMessage(subject, senderPublicKey);
      const senderEncryptedBody = await encryptMessage(body, senderPublicKey);

      const message = new TextEncoder().encode(`${subject}${body}`);
      const signature = await signMessage(message);
      const signatureBase64 = btoa(String.fromCharCode(...signature));

      // payment_tx_signature used to be `'mock_' + Math.random()`, a fabricated
      // receipt for a payment that never happened. Sends are now charged in
      // credits, debited server-side in the same transaction as the insert, so
      // there is nothing left to fake.
      // Everything above -- key lookup, encryption, the wallet signature -- has
      // already happened. What is held back is the irreversible part: the
      // insert, the credit debit and the on-chain anchor. Once those run there
      // is genuinely no undo, because the anchor is immutable by design.
      const draftIdAtSend = currentDraftId;
      const performSend = async () => {
        try {
          const sendResult = await callSecureEndpoint(
            'send_email',
            {
              from_wallet: publicKey.toBase58(),
              to_wallet: recipient,
              encrypted_subject: encryptedSubject,
              encrypted_body: encryptedBody,
              sender_encrypted_subject: senderEncryptedSubject,
              sender_encrypted_body: senderEncryptedBody,
              sender_signature: signatureBase64,
              attachment_count: attachmentCount,
            },
            publicKey,
            signMessage
          );

          if (draftIdAtSend) {
            try {
              await callSecureEndpoint('delete_draft', { draftId: draftIdAtSend }, publicKey, signMessage);
            } catch (err) {
              console.error('Error deleting draft:', err);
            }
          }

          emitCreditsChanged(sendResult?.balance);
          emitMailChanged();
          toast({
            title: 'Sent',
            description:
              typeof sendResult?.cost === 'number'
                ? `${describeCost(sendResult.cost)} used · ${sendResult.balance} remaining`
                : 'Your encrypted email has been delivered',
          });
        } catch (err) {
          console.error('Deferred send failed:', err);
          const insufficient = (err as { error?: string })?.error === 'INSUFFICIENT_CREDITS';
          const e = err as unknown as { balance: number; required: number };
          toast({
            title: 'Send failed',
            description: insufficient
              ? `This message costs ${describeCost(e.required)} and you have ${e.balance}. It is still in your drafts.`
              : 'The message was not sent. It is still in your drafts.',
            variant: 'destructive',
          });
          emitMailChanged();
        }
      };

      // Saved first, so a tab closed inside the undo window loses nothing.
      await saveDraft(false, true);
      const cancel = scheduleSend(performSend);

      toast({
        title: 'Sending…',
        description: `Undo within ${Math.round(UNDO_WINDOW_MS / 1000)} seconds.`,
        action: (
          <ToastAction
            altText="Undo send"
            onClick={() => {
              cancel();
              emitMailChanged();
              toast({
                title: 'Send undone',
                description: 'Nothing was sent and no credits were used. It is in your drafts.',
              });
            }}
          >
            Undo
          </ToastAction>
        ),
      });

      // Reset form
      setTo('');
      setSubject('');
      setBody('');
      setCurrentDraftId(null);
      
      onSent?.();
      onClose();
    } catch (error) {
      console.error('Error sending email:', error);
      // A 402 carries the real numbers. Without this branch it surfaced as the
      // same generic "Failed to send email" as a network fault, and the one
      // thing the user could actually act on -- top up -- went unsaid.
      const insufficient = (error as { error?: string })?.error === 'INSUFFICIENT_CREDITS';
      if (insufficient) {
        const e = error as unknown as { balance: number; required: number };
        toast({
          title: 'Not enough credits',
          description: `This message costs ${describeCost(e.required)} and you have ${e.balance}. Nothing was sent or charged.`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to send email',
          variant: 'destructive',
        });
      }
    } finally {
      setSending(false);
    }
  };

  const handleSchedule = async (scheduledDate: Date) => {
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
      const { data: recipientKeyData, error: lookupError } = await supabase
        .from('encryption_keys')
        .select('public_key')
        .eq('wallet_address', recipient)
        .maybeSingle();

      if (lookupError) {
        toast({
          title: 'Recipient lookup failed',
          description: 'Could not verify recipient registration',
          variant: 'destructive',
        });
        setSending(false);
        return;
      }

      if (!recipientKeyData) {
        // Park it. There is no recipient key to encrypt to yet, so the message
        // is sealed to us and re-sealed to them when they register.
        const { data: ownKey } = await supabase
          .from('encryption_keys')
          .select('public_key')
          .eq('wallet_address', publicKey.toBase58())
          .single();

        if (!ownKey) {
          toast({
            title: 'Cannot park message',
            description: 'No encryption key is registered for this wallet yet.',
            variant: 'destructive',
          });
          setSending(false);
          return;
        }

        const ownPub = await importPublicKey(ownKey.public_key);
        await callSecureEndpoint(
          'park_email',
          {
            from_wallet: publicKey.toBase58(),
            to_wallet: recipient,
            sender_encrypted_subject: await encryptMessage(subject, ownPub),
            sender_encrypted_body: await encryptMessage(body, ownPub),
          },
          publicKey,
          signMessage
        );

        if (currentDraftId) {
          try {
            await callSecureEndpoint('delete_draft', { draftId: currentDraftId }, publicKey, signMessage);
          } catch (err) {
            console.error('Error deleting draft:', err);
          }
        }

        toast({
          title: 'Message parked',
          description:
            'They have not registered a key yet. It will be sent automatically the next time you open xmail after they do — and no credits are charged until then.',
        });

        setTo('');
        setSubject('');
        setBody('');
        setCurrentDraftId(null);
        setSending(false);
        onSent?.();
        onClose();
        return;
      }

      const recipientPublicKey = await importPublicKey(recipientKeyData.public_key);
      const encryptedSubject = await encryptMessage(subject, recipientPublicKey);
      const encryptedBody = await encryptMessage(body, recipientPublicKey);

      const message = new TextEncoder().encode(`${subject}${body}`);
      const signature = await signMessage(message);
      const signatureBase64 = btoa(String.fromCharCode(...signature));

      await callSecureEndpoint(
        'schedule_email',
        {
          to_wallet: recipient,
          encrypted_subject: encryptedSubject,
          encrypted_body: encryptedBody,
          sender_signature: signatureBase64,
          scheduled_for: scheduledDate.toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        publicKey,
        signMessage
      );

      // Delete draft after successful scheduling
      if (currentDraftId) {
        try {
          await callSecureEndpoint(
            'delete_draft',
            { draftId: currentDraftId },
            publicKey,
            signMessage
          );
        } catch (error) {
          console.error('Error deleting draft:', error);
        }
      }

      toast({
        title: 'Email scheduled!',
        description: `Your email will be sent on ${scheduledDate.toLocaleString()}`,
      });

      // Reset form
      setTo('');
      setSubject('');
      setBody('');
      setCurrentDraftId(null);
      setShowScheduleSelector(false);
      
      onSent?.();
      onClose();
    } catch (error) {
      console.error('Error scheduling email:', error);
      toast({
        title: 'Error',
        description: 'Failed to schedule email',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  /**
   * Closing must not lose what you wrote.
   *
   * This used to call saveDraft() without awaiting it and then unmount
   * immediately. The save needs a wallet signature, so it was racing a
   * component teardown, and every failure path inside saveDraft is silent
   * (showToast is false) -- so a draft that never saved was indistinguishable
   * from one that did. Now the save is awaited, and if it fails the composer
   * stays open rather than taking your writing down with it.
   */
  const handleClose = async () => {
    const hasContent = Boolean(to.trim() || subject.trim() || body.trim());
    if (!hasContent || !publicKey || !signMessage) {
      onClose();
      return;
    }

    if (!keysReady) {
      toast({
        title: 'Draft not saved',
        description: 'Unlock encryption first — drafts are stored encrypted, the same as sent mail.',
        variant: 'destructive',
      });
      return;
    }

    setClosing(true);
    const savedId = await saveDraft(false, true);
    setClosing(false);

    if (!savedId) {
      toast({
        title: 'Draft not saved',
        description: 'Your message is still here. Copy it somewhere safe before closing again.',
        variant: 'destructive',
      });
      return;
    }

    toast({ title: 'Draft saved' });
    onClose();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    // This used to copy the files onto a hidden <input> that had no onChange
    // handler at all, then dispatch a change event into the void -- so dropping
    // a file did nothing, silently. It also demanded a saved draft first, which
    // the upload path creates on its own.
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      attachRef.current?.addFiles(files);
    }
  };

  if (!isOpen) return null;

  if (isMinimized) {
    return (
      <div className="fixed bottom-0 right-4 z-50 w-64 rounded-t-xl border border-b-0 border-border bg-[hsl(var(--surface-raised))] shadow-2xl">
        <div
          className="flex h-11 cursor-pointer items-center gap-2 pl-4 pr-2"
          onClick={() => setIsMinimized(false)}
        >
          <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate text-sm">
            {subject.trim() ? subject : 'New message'}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label="Close"
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  // Send and Schedule are the same commitment, so they share one gate.
  // What this send will cost, estimated from the ciphertext the body will
  // produce. RSA-OAEP output is a fixed size per block and the AES envelope is
  // proportional to the plaintext, so plaintext length is a good proxy without
  // paying to encrypt on every keystroke.
  const estimatedCost = creditCost(
    Math.ceil(ciphertextBytes(subject, body) * 1.4) * 2,
    attachmentCount,
  );

  // An unregistered recipient is no longer a dead end: the message is parked,
  // sealed to us, and delivered by the outbox once they register a key. Only a
  // malformed address still blocks.
  const willPark = validationStatus === 'not-registered';
  const blocked = sending || validationStatus === 'invalid';

  // Borderless fields. Superhuman and Gmail both draw the compose surface as one
  // continuous sheet with hairline dividers -- an input box inside a panel inside
  // a modal is three nested rectangles saying the same thing.
  const fieldRow = 'flex items-center gap-3 px-5';
  const fieldLabel = 'w-16 shrink-0 text-xs text-muted-foreground';
  const bareInput =
    'h-9 min-w-0 flex-1 border-0 bg-transparent px-0 py-0 text-sm shadow-none ' +
    'focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/50';

  return (
    <div
      className={cn(
        'fixed z-50 flex flex-col overflow-hidden border border-border bg-[hsl(var(--surface-raised))] shadow-2xl',
        isMaximized
          ? 'inset-4 rounded-2xl'
          : 'bottom-0 right-4 w-[680px] max-w-[calc(100vw-2rem)] rounded-t-2xl',
        !isMaximized && 'h-[70vh] max-h-[760px] min-h-[520px]'
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* --- title bar -------------------------------------------------- */}
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border/60 pl-5 pr-2">
        <h2 className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
          {subject.trim() ? subject : 'New message'}
        </h2>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsMinimized(true)} aria-label="Minimise">
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setIsMaximized(!isMaximized)}
          aria-label={isMaximized ? 'Restore down' : 'Maximise'}
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleClose}
          disabled={closing}
          aria-label={closing ? 'Saving draft' : 'Close'}
          title={closing ? 'Saving draft…' : 'Close'}
        >
          {closing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
        </Button>
      </div>

      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center border-2 border-dashed border-foreground/25 bg-[hsl(var(--surface-raised))]/95">
          <div className="text-center">
            <Upload className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
            <p className="text-sm">Drop to attach</p>
            <p className="mt-1 text-xs text-muted-foreground">{ACCEPTED_SUMMARY}</p>
          </div>
        </div>
      )}

      {/* --- addressing --------------------------------------------------- */}
      <div className="shrink-0">
        <div className={cn(fieldRow, 'border-b border-border/40 py-1')}>
          <span className={fieldLabel}>To</span>
          <div className="min-w-0 flex-1">
            <ContactAutocomplete
              value={to}
              onChange={setTo}
              placeholder="Wallet address"
              className={bareInput}
            />
          </div>
          {/* Whether a recipient can be encrypted to at all is the one thing an
              ordinary mail client never has to tell you. */}
          {validationStatus !== 'idle' && (
            <span
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 text-[11px]',
                validationStatus === 'valid' && 'text-[hsl(var(--verified))]',
                validationStatus === 'invalid' && 'text-destructive',
                validationStatus === 'not-registered' && 'text-[hsl(var(--warning))]',
                validationStatus === 'checking' && 'text-muted-foreground'
              )}
            >
              {validationStatus === 'checking' && <Loader2 className="h-3 w-3 animate-spin" />}
              {validationStatus === 'valid' && <CheckCircle className="h-3 w-3" />}
              {validationStatus === 'invalid' && <XCircle className="h-3 w-3" />}
              {validationStatus === 'not-registered' && <AlertCircle className="h-3 w-3" />}
              {validationStatus === 'valid'
                ? 'Key registered'
                : validationStatus === 'not-registered'
                  ? 'Not registered yet — will park'
                  : validationMessage}
            </span>
          )}
        </div>

        <div className={cn(fieldRow, 'border-b border-border/40 py-1')}>
          <span className={fieldLabel}>Subject</span>
          <Input
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className={bareInput}
          />
        </div>
      </div>

      {/* --- message ------------------------------------------------------
          The writing surface gets the remaining height and no chrome of its
          own. Quill's toolbar is pinned below it by CSS, out of the way. */}
      <div className="flex min-h-0 flex-1 flex-col px-5 py-4">
        <RichTextEditor
          value={body}
          onChange={setBody}
          placeholder="Write your message. It is encrypted in this browser before it leaves."
        />
      </div>

      {/* --- attachment chips --------------------------------------------- */}
      <div className="shrink-0 px-5">
        <AttachmentUpload
          ref={attachRef}
          draftId={currentDraftId}
          walletPublicKey={publicKey}
          signMessage={signMessage}
          onDraftCreated={setCurrentDraftId}
          autoSaveDraft={() => saveDraft(false, true)}
          onCountChange={setAttachmentCount}
        />
      </div>

      {/* --- actions ------------------------------------------------------- */}
      <div className="mt-3 shrink-0 border-t border-border/60 px-5 py-3">
        {showScheduleSelector ? (
          <ScheduleSelector
            onSchedule={handleSchedule}
            onCancel={() => setShowScheduleSelector(false)}
          />
        ) : (
          <div className="flex items-center gap-1">
            <Button onClick={handleSend} disabled={blocked} className="mr-2 px-6">
              {sending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  {willPark ? 'Park message' : 'Send'}
                </>
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => attachRef.current?.open()}
              aria-label="Attach files"
              title={`Attach files — ${ACCEPTED_SUMMARY}`}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            {/* Schedule send is deliberately hidden. process-scheduled-emails is
                deployed but nothing invokes it -- pg_cron is not installed --
                so a scheduled message is written to a table and never sent. A
                button that silently discards mail is worse than no button.
                Restore this the moment a scheduler exists. */}

            <span
              className="text-[11px] text-muted-foreground"
              title="Charged on stored ciphertext plus one credit per attachment"
            >
              {willPark ? 'Free until delivered' : `~${describeCost(estimatedCost)}`}
            </span>

            <div className="ml-auto flex items-center gap-3 text-[11px] text-muted-foreground">
              {saving ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Saving
                </span>
              ) : lastSaved ? (
                <span>Saved {lastSaved.toLocaleTimeString()}</span>
              ) : null}
              <span className="flex items-center gap-1.5">
                <Lock className="h-3 w-3" />
                End-to-end encrypted
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
