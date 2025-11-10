import { useEffect, useState, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase } from '@/integrations/supabase/client';
import { generateKeyPair, exportPublicKey, exportPrivateKey } from '@/lib/encryption';
import { toast } from '@/hooks/use-toast';
import { openKeyManagement } from '@/lib/events';
import { deriveKeyFromWallet, encryptPrivateKeyWithWallet, decryptPrivateKeyWithWallet } from '@/lib/walletKeyDerivation';

export const useEncryptionKeys = () => {
  const { publicKey, connected, signMessage } = useWallet();
  const [keysReady, setKeysReady] = useState(false);
  const setupInProgress = useRef(false);

  useEffect(() => {
    if (!connected || !publicKey || !signMessage) {
      setKeysReady(false);
      return;
    }

    setupKeys();
  }, [connected, publicKey, signMessage]);

  const setupKeys = async () => {
    if (!publicKey || !signMessage) return;
    
    // Prevent simultaneous setup calls
    if (setupInProgress.current) return;
    setupInProgress.current = true;

    try {
      const walletAddress = publicKey.toBase58();
      
      // Early exit: Check localStorage first (no signature needed!)
      const localPrivateKey = localStorage.getItem('encryption_private_key');
      const localPublicKey = localStorage.getItem('encryption_public_key');
      
      if (localPrivateKey && localPublicKey) {
        setKeysReady(true);
        setupInProgress.current = false;
        return;
      }
      
      // Check backend for encrypted private key
      const { data: backendKey, error: lookupError } = await supabase
        .from('encryption_keys')
        .select('public_key, encrypted_private_key, iv')
        .eq('wallet_address', walletAddress)
        .maybeSingle();

      if (lookupError) {
        console.error('Error checking backend registration:', lookupError);
        toast({
          title: "Registration Check Failed",
          description: "Could not verify your encryption key status.",
          variant: "destructive",
        });
        return;
      }

      // Case 1: Backend has encrypted private key - restore it
      if (backendKey?.encrypted_private_key && backendKey?.iv) {
        try {
          const walletKey = await deriveKeyFromWallet(signMessage, walletAddress);
          const privateKey = await decryptPrivateKeyWithWallet(
            backendKey.encrypted_private_key,
            backendKey.iv,
            walletKey
          );
          
          // Store in localStorage for persistent access
          localStorage.setItem('encryption_private_key', privateKey);
          localStorage.setItem('encryption_public_key', backendKey.public_key);
          
          // Clean up old sessionStorage if present
          sessionStorage.removeItem('encryption_private_key');
          sessionStorage.removeItem('encryption_public_key');
          
          toast({ 
            title: "Keys Restored", 
            description: "Your encryption keys are ready across all devices!" 
          });
          setKeysReady(true);
          return;
        } catch (error) {
          console.error('Error decrypting private key:', error);
          toast({ 
            title: "Signature Required", 
            description: "Please sign the message to restore your encryption keys",
            variant: "default" 
          });
          return;
        }
      }

      // Case 2: Migration - User has key in sessionStorage but not encrypted in backend
      const sessionPrivateKey = sessionStorage.getItem('encryption_private_key');
      const sessionPublicKey = sessionStorage.getItem('encryption_public_key');
      
      if (sessionPrivateKey && backendKey && !backendKey.encrypted_private_key) {
        try {
          // Migrate: encrypt their current key and upload to backend
          const walletKey = await deriveKeyFromWallet(signMessage, walletAddress);
          const { encrypted, iv } = await encryptPrivateKeyWithWallet(sessionPrivateKey, walletKey);
          
          await supabase.from('encryption_keys').update({
            encrypted_private_key: encrypted,
            iv: iv
          }).eq('wallet_address', walletAddress);
          
          // Move to localStorage
          localStorage.setItem('encryption_private_key', sessionPrivateKey);
          localStorage.setItem('encryption_public_key', sessionPublicKey || backendKey.public_key);
          sessionStorage.removeItem('encryption_private_key');
          sessionStorage.removeItem('encryption_public_key');
          
          toast({ 
            title: "Keys Upgraded ✓", 
            description: "Your keys are now permanently available across all devices!" 
          });
          setKeysReady(true);
          return;
        } catch (error) {
          console.error('Error migrating keys:', error);
          toast({
            title: "Migration Failed",
            description: "Could not upgrade your keys. Please try again.",
            variant: "destructive",
          });
          return;
        }
      }

      // Case 3: First time setup - no backend key exists
      if (!backendKey) {
        let publicKeyToStore: string;
        let privateKeyToStore: string;

        // Check if we have keys in sessionStorage or localStorage
        const localPrivateKey = localStorage.getItem('encryption_private_key');
        const localPublicKey = localStorage.getItem('encryption_public_key');

        if (localPublicKey && localPrivateKey) {
          // Reuse existing local keys
          publicKeyToStore = localPublicKey;
          privateKeyToStore = localPrivateKey;
        } else if (sessionPublicKey && sessionPrivateKey) {
          // Reuse existing session keys
          publicKeyToStore = sessionPublicKey;
          privateKeyToStore = sessionPrivateKey;
        } else {
          // Generate new keypair
          const keypair = await generateKeyPair();
          publicKeyToStore = await exportPublicKey(keypair.publicKey);
          privateKeyToStore = await exportPrivateKey(keypair.privateKey);
        }

        // Encrypt private key with wallet signature
        const walletKey = await deriveKeyFromWallet(signMessage, walletAddress);
        const { encrypted, iv } = await encryptPrivateKeyWithWallet(privateKeyToStore, walletKey);

        // Upload to backend
        const { error: upsertError } = await supabase
          .from('encryption_keys')
          .upsert({
            wallet_address: walletAddress,
            public_key: publicKeyToStore,
            encrypted_private_key: encrypted,
            iv: iv
          }, {
            onConflict: 'wallet_address'
          });

        if (upsertError) {
          console.error('Error storing encrypted key:', upsertError);
          toast({
            title: "Registration Failed",
            description: "Failed to register your encryption key. Please try reconnecting your wallet.",
            variant: "destructive",
          });
          return;
        }

        // Store in localStorage
        localStorage.setItem('encryption_private_key', privateKeyToStore);
        localStorage.setItem('encryption_public_key', publicKeyToStore);
        
        // Clean up sessionStorage
        sessionStorage.removeItem('encryption_private_key');
        sessionStorage.removeItem('encryption_public_key');

        // Check if this is first-time registration
        const isFirstTime = !localStorage.getItem('xmail_onboarded');
        
        if (isFirstTime) {
          localStorage.setItem('xmail_onboarded', 'true');
          toast({
            title: "🎉 Welcome to xMail!",
            description: "Your encryption keys are now permanently tied to your wallet and work across all devices!",
            duration: 10000,
          });
        } else {
          toast({
            title: "Keys Registered",
            description: "Your encryption keys are ready and backed up.",
          });
        }
      }

      setKeysReady(true);
    } catch (error) {
      console.error('Error setting up encryption keys:', error);
      toast({
        title: "Setup Error",
        description: "An unexpected error occurred during key setup.",
        variant: "destructive",
      });
    } finally {
      setupInProgress.current = false;
    }
  };

  return { keysReady };
};
