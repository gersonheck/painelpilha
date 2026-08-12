import CryptoJS from 'crypto-js';

const encoder = new TextEncoder();
const PASSWORD_ITERATIONS = 210_000;

// Fallback para ambientes não-HTTPS (crypto.subtle não disponível)
const isSecureContext = typeof crypto !== 'undefined' && crypto.subtle !== undefined;

function bytesToHex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

// Fallback JS puro para getRandomValues
function getRandomBytes(length: number): Uint8Array {
  if (isSecureContext) {
    return new Uint8Array(crypto.getRandomValues(new Uint8Array(length)).buffer);
  }
  // Fallback: Math.random (menos seguro, mas funciona em HTTP)
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes;
}

export function normalizeEmail(email: string) {
  return email.trim().toLocaleLowerCase('en-US');
}

export async function deriveCollaboratorId(email: string) {
  const normalized = normalizeEmail(email);
  if (!normalized) throw new Error('Informe um e-mail para continuar.');
  
  if (isSecureContext) {
    const digest = await crypto.subtle.digest(
      'SHA-256',
      encoder.encode(`pilha-plus:collaborator:v1:${normalized}`),
    );
    return bytesToHex(digest);
  }
  
  // Fallback: CryptoJS SHA-256
  const hash = CryptoJS.SHA256(`pilha-plus:collaborator:v1:${normalized}`);
  return hash.toString(CryptoJS.enc.Hex);
}

export function createPasswordSalt() {
  const bytes = getRandomBytes(16);
  return bytesToBase64(bytes);
}

export async function derivePasswordHash(password: string, salt: string) {
  if (password.length < 8) throw new Error('A senha precisa ter pelo menos 8 caracteres.');
  
  if (isSecureContext) {
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits'],
    );
    const bits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        hash: 'SHA-256',
        salt: base64ToBytes(salt),
        iterations: PASSWORD_ITERATIONS,
      },
      keyMaterial,
      256,
    );
    return bytesToBase64(new Uint8Array(bits));
  }
  
  // Fallback: CryptoJS PBKDF2
  const saltBytes = CryptoJS.enc.Base64.parse(salt);
  const hash = CryptoJS.PBKDF2(password, saltBytes, {
    keySize: 256 / 32,
    iterations: PASSWORD_ITERATIONS,
    hasher: CryptoJS.algo.SHA256,
  });
  const base64Hash = hash.toString(CryptoJS.enc.Base64);
  return base64Hash;
}

export function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}
