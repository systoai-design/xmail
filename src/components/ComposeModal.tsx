import { useState, useEffect, useRef, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  X, 
  Minus, 
  Maximize2, 
  Lock, 
  Loader2, 
  DollarSign, 
  Shield, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Send,
  Paperclip,
  Upload
} from 'lucide-react';
import { AttachmentUpload } from '@/components/AttachmentUpload';
import { ContactAutocomplete } from '@/components/ContactAutocomplete';
import { RichTextEditor } from '@/components/RichTextEditor';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { encryptMessage, importPublicKey } from '@/lib/encryption';
import { PublicKey } from '@solana/web3.js';
import { useEncryptionKeys } from '@/hooks/useEncryptionKeys';
import { isAdmin } from '@/lib/userRoles';
import { callSecureEndpoint } from '@/lib/secureApi';
import { cn } from '@/lib/utils';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  draftId?: string | null;
  onSent?: () => void;
  onSubjectChange?: (subject: string) => void;
}

export const ComposeModal = ({ isOpen, onClose, draftId, onSent, onSubjectChange }: ComposeModalProps) => {
  const { publicKey, signMessage } = useWallet();
  const { toast } = useToast();
  const { keysReady } = useEncryptionKeys();
  
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
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
  const autoSaveTimerRef = useRef<NodeJS.Timeout>();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

      const privateKeyBase64 = sessionStorage.getItem('encryption_private_key');
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
          
          const privateKeyBytes = Uint8Array.from(atob(privateKeyBase64), c => c.charCodeAt(0));
          const privateKey = await window.crypto.subtle.importKey(
            'pkcs8',
            privateKeyBytes,
            { name: 'RSA-OAEP', hash: 'SHA-256' },
            false,
            ['decrypt']
          );
          
          if (encrypted_subject) {
            const decryptedSubject = await window.crypto.subtle.decrypt(
              { name: 'RSA-OAEP' },
              privateKey,
              Uint8Array.from(atob(encrypted_subject), c => c.charCodeAt(0))
            );
            setSubject(new TextDecoder().decode(decryptedSubject));
          }
          
          if (encrypted_body) {
            const decryptedBody = await window.crypto.subtle.decrypt(
              { name: 'RSA-OAEP' },
              privateKey,
              Uint8Array.from(atob(encrypted_body), c => c.charCodeAt(0))
            );
            setBody(new TextDecoder().decode(decryptedBody));
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
  const saveDraft = useCallback(async (showToast = false) => {
    if (!publicKey || !signMessage || !keysReady) return;
    if (!to && !subject && !body) return;

    setSaving(true);
    try {
      const { data: ownKeyData } = await supabase
        .from('encryption_keys')
        .select('public_key')
        .eq('wallet_address', publicKey.toBase58())
        .single();

      if (!ownKeyData) return;

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
    } catch (error) {
      console.error('Error saving draft:', error);
      if (showToast) {
        toast({
          title: 'Error',
          description: 'Failed to save draft',
          variant: 'destructive',
        });
      }
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
        toast({
          title: 'Recipient not registered',
          description: 'Recipient must connect their wallet first',
          variant: 'destructive',
        });
        setSending(false);
        return;
      }

      const recipientPublicKey = await importPublicKey(recipientKeyData.public_key);
      const encryptedSubject = await encryptMessage(subject, recipientPublicKey);
      const encryptedBody = await encryptMessage(body, recipientPublicKey);

      const message = new TextEncoder().encode(`${subject}${body}`);
      const signature = await signMessage(message);
      const signatureBase64 = btoa(String.fromCharCode(...signature));

      const mockPaymentTx = userIsAdmin ? 'admin_exempt_' + Math.random().toString(36).substring(7) : 'mock_' + Math.random().toString(36).substring(7);

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

      // Delete draft after successful send
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
        title: 'Email sent!',
        description: 'Your encrypted email has been delivered',
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
      toast({
        title: 'Error',
        description: 'Failed to send email',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    if ((to || subject || body) && publicKey && signMessage) {
      saveDraft(false);
    }
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

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0 && currentDraftId) {
      // Trigger file upload through AttachmentUpload component
      const input = fileInputRef.current;
      if (input) {
        const dataTransfer = new DataTransfer();
        files.forEach(file => dataTransfer.items.add(file));
        input.files = dataTransfer.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    } else if (files.length > 0 && !currentDraftId) {
      toast({
        title: 'Save draft first',
        description: 'Please save this message as a draft before adding attachments',
        variant: 'destructive',
      });
    }
  };

  if (!isOpen) return null;

  if (isMinimized) {
    return (
      <div className="fixed bottom-0 right-4 w-60 bg-background border-t border-l border-r border-border rounded-t-lg shadow-2xl z-50">
        <div className="flex items-center justify-between p-3 cursor-pointer" onClick={() => setIsMinimized(false)}>
          <span className="font-semibold truncate text-sm">
            {subject || 'New Message'}
          </span>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); handleClose(); }}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "fixed bg-background border border-border rounded-t-lg shadow-2xl z-50 flex flex-col",
        "transition-all duration-300",
        isMaximized 
          ? "inset-4" 
          : "bottom-0 right-4 w-[600px] max-w-[calc(100vw-2rem)]",
        !isMaximized && "h-[600px] max-h-[calc(100vh-2rem)]"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
        <h2 className="font-semibold text-sm">New Message</h2>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsMinimized(true)}
          >
            <Minus className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsMaximized(!isMaximized)}
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Form */}
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-4"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragging && (
          <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-lg flex items-center justify-center z-50">
            <div className="text-center">
              <Upload className="w-12 h-12 mx-auto mb-2 text-primary" />
              <p className="text-lg font-semibold">Drop files to attach</p>
            </div>
          </div>
        )}
        {/* To field with autocomplete */}
        <div className="space-y-1">
          <Label htmlFor="to" className="text-sm font-semibold">To</Label>
          <ContactAutocomplete
            value={to}
            onChange={setTo}
            placeholder="Recipient's wallet address or search contacts"
          />
          {validationStatus !== 'idle' && (
            <div className={cn(
              "flex items-center gap-2 text-xs",
              validationStatus === 'valid' && 'text-green-500',
              validationStatus === 'invalid' && 'text-red-500',
              validationStatus === 'not-registered' && 'text-yellow-500',
              validationStatus === 'checking' && 'text-muted-foreground'
            )}>
              {validationStatus === 'checking' && <Loader2 className="w-3 h-3 animate-spin" />}
              {validationStatus === 'valid' && <CheckCircle className="w-3 h-3" />}
              {validationStatus === 'invalid' && <XCircle className="w-3 h-3" />}
              {validationStatus === 'not-registered' && <AlertCircle className="w-3 h-3" />}
              <span>{validationMessage}</span>
            </div>
          )}
        </div>

        {/* Subject */}
        <div className="space-y-1">
          <Label htmlFor="subject" className="text-sm font-semibold">Subject</Label>
          <Input
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Enter subject"
            className="text-sm"
          />
        </div>

        {/* Body with rich text editor */}
        <div className="space-y-1 flex-1">
          <Label htmlFor="body" className="text-sm font-semibold">Message</Label>
          <RichTextEditor
            value={body}
            onChange={setBody}
            placeholder="Write your encrypted message..."
          />
        </div>

        {/* Attachments with drag-and-drop */}
        <div className="space-y-1">
          <Label className="text-sm font-semibold flex items-center gap-2">
            <Paperclip className="w-4 h-4" />
            Attachments
            <span className="text-xs text-muted-foreground font-normal">(Drag & drop files here)</span>
          </Label>
          {currentDraftId ? (
            <>
              <AttachmentUpload
                draftId={currentDraftId}
                walletPublicKey={publicKey}
                signMessage={signMessage}
              />
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
              />
            </>
          ) : (
            <div className="text-xs text-muted-foreground p-3 border border-dashed border-border rounded-lg">
              💡 Save draft first to attach files
            </div>
          )}
        </div>

        {/* Payment/Admin notice */}
        {userIsAdmin ? (
          <div className="flex items-center gap-2 p-3 bg-accent/10 rounded-lg border border-accent/30">
            <Shield className="w-5 h-5 text-accent" />
            <span className="text-sm font-semibold text-accent">Admin - No Payment</span>
          </div>
        ) : (
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-secondary" />
              <div className="text-sm">
                <div className="font-semibold">Payment Required</div>
                <div className="text-xs text-muted-foreground">Gasless Transaction</div>
              </div>
            </div>
            <div className="text-lg font-black text-secondary">$0.01</div>
          </div>
        )}

        {/* Auto-save status */}
        {lastSaved && (
          <div className="text-center text-xs text-muted-foreground">
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                Saving...
              </span>
            ) : (
              <span>Saved {lastSaved.toLocaleTimeString()}</span>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border bg-muted/30">
        <Button
          onClick={handleSend}
          disabled={sending || validationStatus === 'invalid' || validationStatus === 'not-registered'}
          className="w-full font-bold shadow-glow"
        >
          {sending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Send
            </>
          )}
        </Button>
        <p className="text-center text-xs text-muted-foreground mt-2">
          <Lock className="w-3 h-3 inline mr-1" />
          End-to-end encrypted
        </p>
      </div>
    </div>
  );
};
