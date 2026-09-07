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
/**
 * base64 helpers.
 *
 * String.fromCharCode(...bytes) overflows the call stack once a payload gets
 * large, and message bodies are unbounded, so conversion is chunked.
 */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Raw RSA-OAEP. Only safe for payloads under 190 bytes: a 2048-bit modulus
 * holds 256 bytes and OAEP with SHA-256 spends 66 of them on padding.
 * Use it for keys, never for user content.
 */
export async function rsaEncrypt(text: string, recipientPublicKey: CryptoKey): Promise<string> {
  const encrypted = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    recipientPublicKey,
    new TextEncoder().encode(text) as BufferSource
  );
  return bytesToBase64(new Uint8Array(encrypted));
}

export async function rsaDecrypt(encrypted: string, privateKey: CryptoKey): Promise<string> {
  const decrypted = await crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    base64ToBytes(encrypted) as BufferSource
  );
  return new TextDecoder().decode(decrypted);
}

/** Marks the hybrid envelope. Legacy ciphertext is bare base64 and never matches. */
const HYBRID_PREFIX = "xm1:";

/**
 * Encrypt a message for a recipient.
 *
 * This used to hand the message straight to RSA-OAEP, which caps at 190 bytes
 * -- so sending anything longer than about two sentences threw OperationError
 * and the send failed. The body is now encrypted under a single-use AES-256-GCM
 * key and only that key is RSA-wrapped, which is the same construction
 * attachments have always used.
 */
export async function encryptMessage(message: string, recipientPublicKey: CryptoKey): Promise<string> {
  const aesKey = await generateAESKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    new TextEncoder().encode(message) as BufferSource
  );

  const envelope = JSON.stringify({
    v: 1,
    k: await rsaEncrypt(await exportAESKey(aesKey), recipientPublicKey),
    iv: bytesToBase64(iv),
    c: bytesToBase64(new Uint8Array(ciphertext)),
  });

  return HYBRID_PREFIX + btoa(envelope);
}

/**
 * Decrypt message using private key
 */
export async function decryptMessage(encryptedMessage: string, privateKey: CryptoKey): Promise<string> {
  // Mail sent before the hybrid envelope existed is bare RSA ciphertext and has
  // to keep opening, so the format is detected rather than assumed.
  if (!encryptedMessage.startsWith(HYBRID_PREFIX)) {
    return await rsaDecrypt(encryptedMessage, privateKey);
  }

  const { k, iv, c } = JSON.parse(atob(encryptedMessage.slice(HYBRID_PREFIX.length)));
  const aesKey = await importAESKey(await rsaDecrypt(k, privateKey));
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(iv) },
    aesKey,
    base64ToBytes(c) as BufferSource
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
  // Deliberately raw RSA, not encryptMessage: a 44-char exported key fits in one
  // block, and routing it through the hybrid envelope would wrap an AES key in
  // an AES key and change the on-disk format of every existing attachment.
  const aesKeyRaw = await exportAESKey(aesKey);
  return await rsaEncrypt(aesKeyRaw, recipientPublicKey);
}

/**
 * Decrypt AES key with RSA private key
 */
export async function decryptAESKey(encryptedAESKey: string, privateKey: CryptoKey): Promise<CryptoKey> {
  // decryptMessage would also work (it falls through to raw RSA for unprefixed
  // input), but naming the primitive keeps the attachment format explicit.
  const aesKeyRaw = await rsaDecrypt(encryptedAESKey, privateKey);
  return await importAESKey(aesKeyRaw);
}
