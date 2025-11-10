import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase } from '@/integrations/supabase/client';
import { generateKeyPair, exportPublicKey, exportPrivateKey } from '@/lib/encryption';
import { toast } from '@/hooks/use-toast';
import { openKeyManagement } from '@/lib/events';

export const useEncryptionKeys = () => {
  const { publicKey, connected, signMessage } = useWallet();
  const [keysReady, setKeysReady] = useState(false);

  useEffect(() => {
    if (!connected || !publicKey || !signMessage) {
      setKeysReady(false);
      return;
    }

    setupKeys();
  }, [connected, publicKey, signMessage]);

  const setupKeys = async () => {
    if (!publicKey || !signMessage) return;

    try {
      const walletAddress = publicKey.toBase58();
      
      // Always check backend first to verify registration
      const { data: existingBackendKey, error: lookupError } = await supabase
        .from('encryption_keys')
        .select('public_key')
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

      // Get keys from session storage
      const sessionPrivateKey = sessionStorage.getItem('encryption_private_key');
      const sessionPublicKey = sessionStorage.getItem('encryption_public_key');

      // Case 1: No backend registration exists
      if (!existingBackendKey) {
        let publicKeyToStore: string;
        let privateKeyToStore: string;

        if (sessionPublicKey && sessionPrivateKey) {
          // Reuse existing session keys
          publicKeyToStore = sessionPublicKey;
          privateKeyToStore = sessionPrivateKey;
        } else {
          // Generate new keypair
          const keypair = await generateKeyPair();
          publicKeyToStore = await exportPublicKey(keypair.publicKey);
          privateKeyToStore = await exportPrivateKey(keypair.privateKey);
        }

        // Store both keys in session storage
        sessionStorage.setItem('encryption_public_key', publicKeyToStore);
        sessionStorage.setItem('encryption_private_key', privateKeyToStore);

        // Upsert public key to backend
        const { error: upsertError } = await supabase
          .from('encryption_keys')
          .upsert({
            wallet_address: walletAddress,
            public_key: publicKeyToStore,
          }, {
            onConflict: 'wallet_address'
          });

        if (upsertError) {
          console.error('Error storing public key:', upsertError);
          toast({
            title: "Registration Failed",
            description: "Failed to register your encryption key. Please try reconnecting your wallet.",
            variant: "destructive",
          });
          return;
        }

        // Check if this is first-time registration
        const isFirstTime = !sessionStorage.getItem('xmail_onboarded');
        
        if (isFirstTime) {
          sessionStorage.setItem('xmail_onboarded', 'true');
          toast({
            title: "🎉 Welcome to xMail!",
            description: "Your encryption keys are ready! You can now send and receive end-to-end encrypted messages. Remember to backup your keys for other devices.",
            duration: 10000,
          });
        } else {
          toast({
            title: "Keys Registered",
            description: "Your encryption keys have been successfully registered.",
          });
        }
      } 
      // Case 2: Backend has key, but session is missing private key
      else if (!sessionPrivateKey) {
        toast({
          title: "Private Key Not Found",
          description: "Import your key from another device to read past messages.",
          variant: "default",
          duration: 8000,
        });
        
        // Auto-trigger key management dialog after a brief delay
        setTimeout(() => {
          openKeyManagement();
        }, 1000);
      }
      // Case 3: Both backend and session have keys - all good!

      setKeysReady(true);
    } catch (error) {
      console.error('Error setting up encryption keys:', error);
      toast({
        title: "Setup Error",
        description: "An unexpected error occurred during key setup.",
        variant: "destructive",
      });
    }
  };

  return { keysReady };
};
