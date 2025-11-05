// Web Crypto API based encryption utilities for email

export interface EncryptionKeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

/**
 * Generate RSA-OAEP keypair for encryption
 */
export async function generateKeyPair(): Promise<EncryptionKeyPair> {
  const keypair = await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );

  return keypair as EncryptionKeyPair;
}

/**
 * Export public key to base64 string for storage
 */
export async function exportPublicKey(publicKey: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey("spki", publicKey);
  const exportedAsBase64 = btoa(String.fromCharCode(...new Uint8Array(exported)));
  return exportedAsBase64;
}

/**
 * Import public key from base64 string
 */
export async function importPublicKey(publicKeyBase64: string): Promise<CryptoKey> {
  const binaryString = atob(publicKeyBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return await crypto.subtle.importKey(
    "spki",
    bytes as BufferSource,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["encrypt"]
  );
}

/**
 * Export private key to base64 string for temporary storage
 */
export async function exportPrivateKey(privateKey: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey("pkcs8", privateKey);
  const exportedAsBase64 = btoa(String.fromCharCode(...new Uint8Array(exported)));
  return exportedAsBase64;
}

/**
 * Import private key from base64 string
 */
export async function importPrivateKey(privateKeyBase64: string): Promise<CryptoKey> {
  const binaryString = atob(privateKeyBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return await crypto.subtle.importKey(
    "pkcs8",
    bytes as BufferSource,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["decrypt"]
  );
}

/**
 * Encrypt message for recipient using their public key
 */
export async function encryptMessage(message: string, recipientPublicKey: CryptoKey): Promise<string> {
  const encoded = new TextEncoder().encode(message);
  const encrypted = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    recipientPublicKey,
    encoded as BufferSource
  );
  return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
}

/**
 * Decrypt message using private key
 */
export async function decryptMessage(encryptedMessage: string, privateKey: CryptoKey): Promise<string> {
  const binaryString = atob(encryptedMessage);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const decrypted = await crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    bytes as BufferSource
  );
  return new TextDecoder().decode(decrypted);
}
