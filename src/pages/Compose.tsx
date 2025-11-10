import { useState, useEffect, useRef, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Lock, Loader2, DollarSign, Shield, CheckCircle, XCircle, AlertCircle, Save, Trash2, Paperclip } from 'lucide-react';
import { AttachmentUpload } from '@/components/AttachmentUpload';
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
  const [searchParams] = useSearchParams();
  const draftIdFromUrl = searchParams.get('draft');
  
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid' | 'not-registered'>('idle');
  const [validationMessage, setValidationMessage] = useState('');
  const [userIsAdmin, setUserIsAdmin] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(draftIdFromUrl);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout>();

  // Check admin status on mount
  useEffect(() => {
    if (publicKey) {
      isAdmin(publicKey.toBase58()).then(setUserIsAdmin);
    }
  }, [publicKey]);

  // Load draft if ID is in URL
  useEffect(() => {
    const loadDraft = async () => {
      if (!draftIdFromUrl || !publicKey || !signMessage || !keysReady) return;

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
          { draftId: draftIdFromUrl },
          publicKey,
          signMessage
        );

        if (response.draft) {
          const { to_wallet, encrypted_subject, encrypted_body } = response.draft;
          setTo(to_wallet || '');
          
          // Import private key for decryption
          const privateKeyBytes = Uint8Array.from(atob(privateKeyBase64), c => c.charCodeAt(0));
          const privateKey = await window.crypto.subtle.importKey(
            'pkcs8',
            privateKeyBytes,
            { name: 'RSA-OAEP', hash: 'SHA-256' },
            false,
            ['decrypt']
          );
          
          // Decrypt subject and body
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
          
          setCurrentDraftId(draftIdFromUrl);
          toast({
            title: 'Draft loaded',
            description: 'Continue editing your message',
          });
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
  }, [draftIdFromUrl, publicKey, signMessage, keysReady, toast]);

  // Auto-save draft every 10 seconds
  const saveDraft = useCallback(async (showToast = false) => {
    if (!publicKey || !signMessage || !keysReady) return;
    if (!to && !subject && !body) return; // Don't save empty drafts

    setSaving(true);
    try {
      // Get our own public key for encryption
      const { data: ownKeyData } = await supabase
        .from('encryption_keys')
        .select('public_key')
        .eq('wallet_address', publicKey.toBase58())
        .single();

      if (!ownKeyData) return;

      const ownPublicKey = await importPublicKey(ownKeyData.public_key);

      // Encrypt the draft with our own key
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
        // Update URL without navigation
        window.history.replaceState({}, '', `/compose?draft=${response.draftId}`);
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
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      saveDraft(false);
    }, 10000); // 10 seconds

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [to, subject, body, saveDraft]);

  // Save on unmount
  useEffect(() => {
    return () => {
      if ((to || subject || body) && publicKey && signMessage) {
        saveDraft(false);
      }
    };
  }, [to, subject, body, publicKey, signMessage, saveDraft]);

  const deleteDraft = async () => {
    if (!currentDraftId || !publicKey || !signMessage) return;

    try {
      await callSecureEndpoint(
        'delete_draft',
        { draftId: currentDraftId },
        publicKey,
        signMessage
      );

      toast({
        title: 'Draft deleted',
        description: 'Your draft has been removed',
      });

      navigate('/inbox?tab=drafts');
    } catch (error) {
      console.error('Error deleting draft:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete draft',
        variant: 'destructive',
      });
    }
  };

  // Live recipient validation with debounce
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
          setValidationMessage('✓ Recipient is registered and ready to receive');
        } else {
          setValidationStatus('not-registered');
          setValidationMessage('⚠ Recipient must connect their wallet first');
        }
      } catch {
        setValidationStatus('invalid');
        setValidationMessage('✗ Invalid Solana wallet address');
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
          console.error('Error deleting draft after send:', error);
        }
      }

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
        <div className="container mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
          <Button
            onClick={() => navigate('/inbox?tab=drafts')}
            variant="ghost"
            size="sm"
            className="font-bold"
          >
            <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 md:mr-2" />
            <span className="hidden md:inline">Back to Inbox</span>
          </Button>
          <div className="flex items-center gap-2 md:gap-3">
            {lastSaved && (
              <span className="hidden sm:inline text-xs md:text-sm text-muted-foreground">
                {saving ? 'Saving...' : `Saved ${lastSaved.toLocaleTimeString()}`}
              </span>
            )}
            {currentDraftId && (
              <>
                <Button
                  onClick={() => saveDraft(true)}
                  variant="outline"
                  size="sm"
                  disabled={saving}
                  className="hidden sm:flex"
                >
                  <Save className="w-4 h-4 md:mr-2" />
                  <span className="hidden md:inline">Save Draft</span>
                </Button>
                <Button
                  onClick={deleteDraft}
                  variant="destructive"
                  size="sm"
                  className="hidden sm:flex"
                >
                  <Trash2 className="w-4 h-4 md:mr-2" />
                  <span className="hidden md:inline">Delete Draft</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 md:px-6 py-4 md:py-8 max-w-4xl">
        <div className="mb-4 md:mb-8">
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-black mb-2">
            {currentDraftId ? 'Edit Draft' : 'New Encrypted Message'}
          </h1>
          <p className="text-base md:text-xl text-muted-foreground flex items-center gap-2">
            <Lock className="w-4 h-4 md:w-5 md:h-5" />
            Only the recipient can decrypt this message
          </p>
        </div>

        <div className="glass p-4 md:p-6 lg:p-8 rounded-xl md:rounded-2xl space-y-4 md:space-y-6">
          <div className="space-y-2">
            <Label htmlFor="to" className="text-base md:text-lg lg:text-xl font-bold">
              To (Wallet Address)
            </Label>
            <Input
              id="to"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="Recipient's wallet address"
              className="h-12 md:h-14 text-sm md:text-base lg:text-lg font-mono"
            />
            {validationStatus !== 'idle' && (
              <div className={`flex items-center gap-2 text-sm ${
                validationStatus === 'valid' ? 'text-green-500' :
                validationStatus === 'invalid' ? 'text-red-500' :
                validationStatus === 'not-registered' ? 'text-yellow-500' :
                'text-muted-foreground'
              }`}>
                {validationStatus === 'checking' && <Loader2 className="w-4 h-4 animate-spin" />}
                {validationStatus === 'valid' && <CheckCircle className="w-4 h-4" />}
                {validationStatus === 'invalid' && <XCircle className="w-4 h-4" />}
                {validationStatus === 'not-registered' && <AlertCircle className="w-4 h-4" />}
                <span>{validationMessage}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject" className="text-base md:text-lg lg:text-xl font-bold">
              Subject
            </Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter subject"
              className="h-12 md:h-14 text-sm md:text-base lg:text-lg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body" className="text-base md:text-lg lg:text-xl font-bold">
              Message
            </Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your encrypted message..."
              className="min-h-[200px] md:min-h-[300px] text-sm md:text-base lg:text-lg"
            />
          </div>

          {/* File Attachments */}
          <div className="space-y-2">
            <Label className="text-base md:text-lg lg:text-xl font-bold flex items-center gap-2">
              <Paperclip className="w-4 h-4 md:w-5 md:h-5" />
              Attachments
            </Label>
            {currentDraftId ? (
              <AttachmentUpload
                draftId={currentDraftId}
                walletPublicKey={publicKey}
                signMessage={signMessage}
              />
            ) : (
              <div className="text-xs md:text-sm text-muted-foreground p-3 md:p-4 border border-dashed border-border rounded-lg">
                💡 Save your draft first to attach files
              </div>
            )}
          </div>

          {/* Admin Badge or Payment Preview */}
          {userIsAdmin ? (
            <div className="glass p-4 md:p-6 rounded-lg md:rounded-xl border-2 border-accent/30">
              <div className="flex items-center justify-center gap-2 md:gap-3">
                <Shield className="w-6 h-6 md:w-8 md:h-8 text-accent" />
                <div className="text-base md:text-xl font-bold text-accent text-center md:text-left">
                  Admin Access - No Payment Required
                </div>
              </div>
            </div>
          ) : (
            <div className="glass p-4 md:p-6 rounded-lg md:rounded-xl border-2 border-primary/30">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 md:gap-3">
                  <DollarSign className="w-6 h-6 md:w-8 md:h-8 text-secondary" />
                  <div>
                    <div className="text-base md:text-lg font-bold">Payment Required</div>
                    <div className="text-xs md:text-sm text-muted-foreground">
                      xmail Protocol • Gasless Transaction
                    </div>
                  </div>
                </div>
                <div className="text-2xl md:text-3xl font-black text-secondary">
                  $0.01 USDC
                </div>
              </div>
            </div>
          )}

          {/* Auto-save status */}
          {lastSaved && (
            <div className="text-center text-xs md:text-sm text-muted-foreground">
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Saving draft...
                </span>
              ) : (
                <span>Auto-saved at {lastSaved.toLocaleTimeString()}</span>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
            <Button
              onClick={() => saveDraft(true)}
              variant="outline"
              size="lg"
              disabled={saving || (!to && !subject && !body)}
              className="flex-1 h-12 md:h-14 lg:h-16 text-base md:text-lg lg:text-xl font-bold"
            >
              <Save className="w-4 h-4 md:w-5 md:h-5 mr-2" />
              {saving ? 'Saving...' : 'Save Draft'}
            </Button>
            
            {currentDraftId && (
              <Button
                onClick={deleteDraft}
                variant="destructive"
                size="lg"
                className="h-12 md:h-14 lg:h-16 px-4 md:px-6"
              >
                <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                <span className="ml-2 sm:hidden">Delete</span>
              </Button>
            )}
            
            <Button
              onClick={handleSend}
              disabled={sending || validationStatus === 'invalid' || validationStatus === 'not-registered'}
              size="lg"
              className="flex-1 h-12 md:h-14 lg:h-16 text-base md:text-lg lg:text-xl font-black shadow-glow"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 md:w-5 md:h-5 mr-2 animate-spin" />
                  <span className="hidden sm:inline">Encrypting & Sending...</span>
                  <span className="sm:hidden">Sending...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                  Encrypt & Send
                </>
              )}
            </Button>
          </div>

          <p className="text-center text-xs md:text-sm text-muted-foreground">
            Your message will be encrypted end-to-end. Only the recipient's wallet can decrypt it.
          </p>
        </div>
      </main>
    </div>
  );
};

export default Compose;