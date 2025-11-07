/**
 * Password-based encryption utilities using Web Crypto API
 * Provides secure encryption/decryption of private keys with user passwords
 */

/**
 * Derive encryption key from password using PBKDF2
 */
async function deriveKeyFromPassword(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    passwordBuffer as unknown as BufferSource,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  
  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: 100000,
      hash: 'SHA-256'
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt private key with password
 */
export async function encryptKeyWithPassword(privateKeyBase64: string, password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKeyFromPassword(password, salt);
  
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(privateKeyBase64);
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    dataBuffer as unknown as BufferSource
  );
  
  // Combine salt + iv + encrypted data
  const encryptedArray = new Uint8Array(encrypted);
  const combined = new Uint8Array(salt.length + iv.length + encryptedArray.length);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(encryptedArray, salt.length + iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt private key with password
 */
export async function decryptKeyWithPassword(encryptedData: string, password: string): Promise<string> {
  const combined = new Uint8Array(
    atob(encryptedData).split('').map(c => c.charCodeAt(0))
  );
  
  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const encryptedBytes = combined.slice(28);
  
  const key = await deriveKeyFromPassword(password, salt);
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    encryptedBytes as unknown as BufferSource
  );
  
  return new TextDecoder().decode(decrypted);
}
