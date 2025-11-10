/**
 * Wallet-based key derivation utilities
 * Derives encryption keys from Solana wallet signatures to enable
 * permanent, cross-device encryption key storage
 */

/**
 * Sign a deterministic message to derive an encryption key
 * This message will always be the same, so signature is deterministic
 */
export async function deriveKeyFromWallet(
  signMessage: (message: Uint8Array) => Promise<Uint8Array>,
  walletAddress: string
): Promise<CryptoKey> {
  const message = `xMail Key Encryption v1\nWallet: ${walletAddress}`;
  const messageBytes = new TextEncoder().encode(message);
  
  // Sign the message with Solana wallet
  const signature = await signMessage(messageBytes);
  
  // Use signature as key material for AES-256-GCM
  const signatureBuffer = signature.slice(0, 32).buffer as ArrayBuffer; // Use first 32 bytes
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    signatureBuffer,
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  
  // Derive AES key
  const saltBytes = new TextEncoder().encode("xmail-v1");
  return await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBytes.buffer as ArrayBuffer,
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypt private key with wallet-derived key
 */
export async function encryptPrivateKeyWithWallet(
  privateKeyBase64: string,
  walletDerivedKey: CryptoKey
): Promise<{ encrypted: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(privateKeyBase64);
  
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
    walletDerivedKey,
    data.buffer as ArrayBuffer
  );
  
  return {
    encrypted: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv: btoa(String.fromCharCode(...iv))
  };
}

/**
 * Decrypt private key with wallet-derived key
 */
export async function decryptPrivateKeyWithWallet(
  encryptedPrivateKey: string,
  iv: string,
  walletDerivedKey: CryptoKey
): Promise<string> {
  const encryptedBytes = Uint8Array.from(atob(encryptedPrivateKey), c => c.charCodeAt(0));
  const ivBytes = Uint8Array.from(atob(iv), c => c.charCodeAt(0));
  
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivBytes.buffer as ArrayBuffer },
    walletDerivedKey,
    encryptedBytes.buffer as ArrayBuffer
  );
  
  return new TextDecoder().decode(decrypted);
}
