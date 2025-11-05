import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase } from '@/integrations/supabase/client';
import { generateKeyPair, exportPublicKey, exportPrivateKey } from '@/lib/encryption';

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
      // Check if we already have keys in session storage
      const existingPrivateKey = sessionStorage.getItem('encryption_private_key');
      
      if (existingPrivateKey) {
        setKeysReady(true);
        return;
      }

      // Generate new keypair
      const keypair = await generateKeyPair();
      const publicKeyBase64 = await exportPublicKey(keypair.publicKey);
      const privateKeyBase64 = await exportPrivateKey(keypair.privateKey);

      // Store private key in session storage (temporary)
      sessionStorage.setItem('encryption_private_key', privateKeyBase64);

      // Store public key in database
      const { error } = await supabase
        .from('encryption_keys')
        .upsert({
          wallet_address: publicKey.toBase58(),
          public_key: publicKeyBase64,
        }, {
          onConflict: 'wallet_address'
        });

      if (error) {
        console.error('Error storing public key:', error);
      }

      setKeysReady(true);
    } catch (error) {
      console.error('Error setting up encryption keys:', error);
    }
  };

  return { keysReady };
};
