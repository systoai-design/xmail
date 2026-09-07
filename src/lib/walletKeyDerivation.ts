/**
 * Wallet-derived key material.
 *
 * The encrypted backup of your private key is locked with a key derived from a
 * wallet signature, so only that wallet can unlock it and nothing has to be
 * remembered or stored anywhere.
 *
 * This depends on the wallet signing deterministically: the same message and
 * key must always yield the same signature, or the derived key changes and the
 * backup stops opening. Ethereum wallets use RFC 6979 deterministic ECDSA, so
 * this holds -- but it is a real assumption, not an incidental one.
 *
 * Versioned v2 because the scheme changed with the move from Solana to EVM.
 * v1 backups were made by Solana wallets whose addresses no longer exist here.
 */

/**
 * Sign a deterministic message to derive an encryption key
 * This message will always be the same, so signature is deterministic
 */
export async function deriveKeyFromWallet(
  signMessage: (message: string) => Promise<string>,
  walletAddress: string
): Promise<CryptoKey> {
  // Versioned v2 because the scheme changed with the move from Solana to EVM,
  // and lowercased because the same wallet must never derive two different keys
  // depending on how the address happened to be cased.
  const message = `xmail Key Encryption v2\nWallet: ${walletAddress.toLowerCase()}`;

  // personal_sign returns a 0x-prefixed 65-byte signature. This relies on the
  // wallet signing deterministically -- Ethereum wallets use RFC 6979, so the
  // same message and key always give the same signature. If that stopped
  // holding, the derived key would change and the backup would stop opening.
  const signatureHex = await signMessage(message);
  const hex = signatureHex.startsWith("0x") ? signatureHex.slice(2) : signatureHex;
  const signature = new Uint8Array(hex.length / 2);
  for (let i = 0; i < signature.length; i++) {
    signature[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }

  const signatureBuffer = signature.slice(0, 32).buffer as ArrayBuffer;
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
