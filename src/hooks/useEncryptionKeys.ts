import { useEffect, useRef, useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  generateKeyPair,
  exportPublicKey,
  exportPrivateKey,
} from "@/lib/encryption";
import {
  deriveKeyFromWallet,
  encryptPrivateKeyWithWallet,
  decryptPrivateKeyWithWallet,
} from "@/lib/walletKeyDerivation";

/**
 * Encryption key lifecycle.
 *
 * The important rule here, learned the hard way: NEVER request a wallet
 * signature from an effect. Wallets ignore or silently queue signature requests
 * that are not tied to a user gesture, so the await never settles, the setup
 * flag stays true, and the app sits on "Keys Not Ready" forever with no error.
 *
 * So mount does only the work that needs no signature:
 *   - local key present            -> ready immediately
 *   - no key registered anywhere   -> generate locally, ready immediately
 *   - key registered but not local -> needsUnlock, and the UI asks for a click
 *
 * `unlock()` is the only thing that signs, and it is only ever called from a
 * button.
 */
export const useEncryptionKeys = () => {
  const { publicKey, connected, signMessage } = useWallet();
  const { toast } = useToast();

  const [keysReady, setKeysReady] = useState(false);
  const [needsUnlock, setNeedsUnlock] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const setupInProgress = useRef(false);

  const walletAddress = publicKey?.toBase58() ?? null;

  useEffect(() => {
    if (!connected || !walletAddress) {
      setKeysReady(false);
      setNeedsUnlock(false);
      return;
    }
    void setup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, walletAddress]);

  /** Signature-free. Safe to run from an effect. */
  const setup = async () => {
    if (!walletAddress || setupInProgress.current) return;
    setupInProgress.current = true;

    try {
      // 1. Already unlocked on this device.
      if (
        localStorage.getItem("encryption_private_key") &&
        localStorage.getItem("encryption_public_key")
      ) {
        setKeysReady(true);
        setNeedsUnlock(false);
        return;
      }

      const { data: backendKey, error } = await supabase
        .from("encryption_keys")
        .select("public_key, encrypted_private_key, iv")
        .eq("wallet_address", walletAddress)
        .maybeSingle();

      if (error) {
        console.error("Key lookup failed:", error);
        toast({
          title: "Could not reach the key registry",
          description: "Check your connection and reload.",
          variant: "destructive",
        });
        return;
      }

      // 2. A wrapped key exists but this device does not have it. Unwrapping
      //    needs a signature, so it waits for a click.
      if (backendKey?.encrypted_private_key && backendKey?.iv) {
        setNeedsUnlock(true);
        setKeysReady(false);
        return;
      }

      // 3. Nothing registered. Generating a keypair needs no signature, so the
      //    user is productive immediately; the encrypted backup is deferred to
      //    unlock(), which does need one.
      const { publicKey: pub, privateKey: priv } = await generateKeyPair();
      const publicKeyBase64 = await exportPublicKey(pub);
      const privateKeyBase64 = await exportPrivateKey(priv);

      localStorage.setItem("encryption_private_key", privateKeyBase64);
      localStorage.setItem("encryption_public_key", publicKeyBase64);

      if (!backendKey) {
        // First registration for this wallet. Insert only -- public_key is
        // immutable once written, so this must never become an update.
        const { error: insertError } = await supabase
          .from("encryption_keys")
          .insert({ wallet_address: walletAddress, public_key: publicKeyBase64 });
        if (insertError) console.error("Key registration failed:", insertError);
      } else if (backendKey.public_key !== publicKeyBase64) {
        // A different public key is already registered for this wallet and the
        // registry is append-only, so we cannot silently replace it. Say so
        // rather than pretending mail will be readable.
        toast({
          title: "A different key is registered for this wallet",
          description:
            "Unlock with the original wallet, or rotate the key from Key Management.",
          variant: "destructive",
        });
      }

      setKeysReady(true);
      setNeedsUnlock(false);
    } catch (err) {
      console.error("Key setup failed:", err);
      toast({
        title: "Key setup failed",
        description: "Reconnect your wallet and try again.",
        variant: "destructive",
      });
    } finally {
      setupInProgress.current = false;
    }
  };

  /**
   * Unwraps the stored private key. MUST be called from a user gesture -- it
   * asks the wallet for a signature.
   */
  const unlock = useCallback(async () => {
    if (!walletAddress || !signMessage || unlocking) return;
    setUnlocking(true);

    try {
      const { data: backendKey, error } = await supabase
        .from("encryption_keys")
        .select("public_key, encrypted_private_key, iv")
        .eq("wallet_address", walletAddress)
        .maybeSingle();

      if (error || !backendKey?.encrypted_private_key || !backendKey.iv) {
        toast({
          title: "Nothing to unlock",
          description: "No encrypted key is stored for this wallet.",
          variant: "destructive",
        });
        return;
      }

      const walletKey = await deriveKeyFromWallet(signMessage, walletAddress);
      const privateKeyBase64 = await decryptPrivateKeyWithWallet(
        backendKey.encrypted_private_key,
        backendKey.iv,
        walletKey,
      );

      localStorage.setItem("encryption_private_key", privateKeyBase64);
      localStorage.setItem("encryption_public_key", backendKey.public_key);
      sessionStorage.removeItem("encryption_private_key");
      sessionStorage.removeItem("encryption_public_key");

      setKeysReady(true);
      setNeedsUnlock(false);
      toast({ title: "Encryption unlocked" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const rejected = /reject|cancel|denied|user/i.test(msg);
      console.error("Unlock failed:", err);
      toast({
        title: rejected ? "Signature declined" : "Could not unlock encryption",
        description: rejected
          ? "Approve the signature request to decrypt your mail."
          : "That signature did not match the stored key.",
        variant: "destructive",
      });
    } finally {
      setUnlocking(false);
    }
  }, [walletAddress, signMessage, unlocking, toast]);

  /** Backs the local key up, wrapped to the wallet. Also needs a gesture. */
  const backupKey = useCallback(async () => {
    if (!walletAddress || !signMessage) return;
    const privateKeyBase64 = localStorage.getItem("encryption_private_key");
    if (!privateKeyBase64) return;

    try {
      const walletKey = await deriveKeyFromWallet(signMessage, walletAddress);
      const { encrypted, iv } = await encryptPrivateKeyWithWallet(privateKeyBase64, walletKey);
      // encrypted_private_key is write-once from NULL; public_key is untouched.
      const { error } = await supabase
        .from("encryption_keys")
        .update({ encrypted_private_key: encrypted, iv })
        .eq("wallet_address", walletAddress)
        .is("encrypted_private_key", null);
      if (error) console.error("Key backup failed:", error);
    } catch (err) {
      console.error("Key backup failed:", err);
    }
  }, [walletAddress, signMessage]);

  return { keysReady, needsUnlock, unlocking, unlock, backupKey };
};
