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

// === FILE ENCRYPTION (AES-256-GCM for large files) ===

/**
 * Generate AES-256 key for file encryption
 */
export async function generateAESKey(): Promise<CryptoKey> {
  return await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

/**
 * Export AES key to base64 string
 */
export async function exportAESKey(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey("raw", key);
  return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

/**
 * Import AES key from base64 string
 */
export async function importAESKey(keyBase64: string): Promise<CryptoKey> {
  const binaryString = atob(keyBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return await window.crypto.subtle.importKey(
    "raw",
    bytes,
    { name: "AES-GCM" },
    true,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypt file with AES-256-GCM
 */
export async function encryptFile(
  file: ArrayBuffer,
  aesKey: CryptoKey
): Promise<{ encrypted: ArrayBuffer; iv: string }> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    file
  );
  return { 
    encrypted, 
    iv: btoa(String.fromCharCode(...iv))
  };
}

/**
 * Decrypt file with AES-256-GCM
 */
export async function decryptFile(
  encryptedFile: ArrayBuffer,
  aesKey: CryptoKey,
  ivBase64: string
): Promise<ArrayBuffer> {
  const ivBinaryString = atob(ivBase64);
  const iv = new Uint8Array(ivBinaryString.length);
  for (let i = 0; i < ivBinaryString.length; i++) {
    iv[i] = ivBinaryString.charCodeAt(i);
  }
  return await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    aesKey,
    encryptedFile
  );
}

/**
 * Encrypt AES key with RSA public key for recipient
 */
export async function encryptAESKey(aesKey: CryptoKey, recipientPublicKey: CryptoKey): Promise<string> {
  const aesKeyRaw = await exportAESKey(aesKey);
  return await encryptMessage(aesKeyRaw, recipientPublicKey);
}

/**
 * Decrypt AES key with RSA private key
 */
export async function decryptAESKey(encryptedAESKey: string, privateKey: CryptoKey): Promise<CryptoKey> {
  const aesKeyRaw = await decryptMessage(encryptedAESKey, privateKey);
  return await importAESKey(aesKeyRaw);
}
