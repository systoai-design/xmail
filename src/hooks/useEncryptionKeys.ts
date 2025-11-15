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

    // Instant key setup - no cooldowns, no delays
    setupKeys();
  }, [connected, publicKey?.toBase58(), signMessage]);

  const setupKeys = async () => {
    if (!publicKey || !signMessage) return;
    
    // Prevent simultaneous setup calls
    if (setupInProgress.current) return;
    setupInProgress.current = true;

    try {
      const walletAddress = publicKey.toBase58();
      
      // INSTANT: Check localStorage first (no signature, no network call!)
      const localPrivateKey = localStorage.getItem('encryption_private_key');
      const localPublicKey = localStorage.getItem('encryption_public_key');
      
      if (localPrivateKey && localPublicKey) {
        // Keys ready instantly!
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
          
          // Store in localStorage for instant access
          localStorage.setItem('encryption_private_key', privateKey);
          localStorage.setItem('encryption_public_key', backendKey.public_key);
          
          // Clean up old sessionStorage if present
          sessionStorage.removeItem('encryption_private_key');
          sessionStorage.removeItem('encryption_public_key');
          
          // Keys ready instantly
          setKeysReady(true);
          return;
        } catch (error) {
          console.error('Error decrypting private key:', error);
          // User rejected signature - generate new keys locally instead
          if (error instanceof Error && (error.message.includes('rejected') || error.message.includes('cancelled'))) {
            // Fall through to generate new keys
          }
        }
      }

      // Case 2: Backend has public key but no private key - migrate from sessionStorage
      if (backendKey?.public_key && !backendKey?.encrypted_private_key) {
        const sessionPrivateKey = sessionStorage.getItem('encryption_private_key');
        const sessionPublicKey = sessionStorage.getItem('encryption_public_key');
        
        if (sessionPrivateKey && sessionPublicKey === backendKey.public_key) {
          // Instant migration - keys ready immediately
          localStorage.setItem('encryption_private_key', sessionPrivateKey);
          localStorage.setItem('encryption_public_key', sessionPublicKey);
          sessionStorage.removeItem('encryption_private_key');
          sessionStorage.removeItem('encryption_public_key');
          
          setKeysReady(true);
          
          // Background sync (non-blocking)
          try {
            const walletKey = await deriveKeyFromWallet(signMessage, walletAddress);
            const { encrypted, iv } = await encryptPrivateKeyWithWallet(sessionPrivateKey, walletKey);
            
            await supabase
              .from('encryption_keys')
              .update({
                encrypted_private_key: encrypted,
                iv: iv,
                updated_at: new Date().toISOString(),
              })
              .eq('wallet_address', walletAddress);
          } catch (error) {
            console.error('Background sync failed:', error);
          }
          return;
        }
      }

      // Case 3: No keys exist - generate instantly
      console.log('Generating new encryption keys...');
      const { publicKey: newPublicKey, privateKey: newPrivateKey } = await generateKeyPair();
      const publicKeyBase64 = await exportPublicKey(newPublicKey);
      const privateKeyBase64 = await exportPrivateKey(newPrivateKey);
      
      // Store locally FIRST - instant access!
      localStorage.setItem('encryption_private_key', privateKeyBase64);
      localStorage.setItem('encryption_public_key', publicKeyBase64);
      
      // Keys ready instantly
      setKeysReady(true);
      
      // Background backup (non-blocking)
      setTimeout(async () => {
        try {
          const walletKey = await deriveKeyFromWallet(signMessage, walletAddress);
          const { encrypted, iv } = await encryptPrivateKeyWithWallet(privateKeyBase64, walletKey);
          
          await supabase
            .from('encryption_keys')
            .upsert({
              wallet_address: walletAddress,
              public_key: publicKeyBase64,
              encrypted_private_key: encrypted,
              iv: iv,
              key_created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
        } catch (error) {
          console.error('Background backup failed:', error);
        }
      }, 100);
    } catch (error) {
      console.error('Error setting up keys:', error);
      toast({
        title: "Key Setup Error",
        description: "Could not set up encryption keys. Please try reconnecting your wallet.",
        variant: "destructive",
      });
    } finally {
      setupInProgress.current = false;
    }
  };

  return {
    keysReady,
  };
};
