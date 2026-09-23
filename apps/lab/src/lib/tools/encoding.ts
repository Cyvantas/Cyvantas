/**
 * Low-level, Unicode-safe conversions between text, bytes, and Base64 —
 * all local to the browser (btoa/atob + TextEncoder/TextDecoder). Shared by
 * the Base64 and JWT tools so decoding rules stay identical.
 */

const BASE64_STANDARD = /^[A-Za-z0-9+/]*={0,2}$/;

function bytesToBinaryString(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return binary;
}

function binaryStringToBytes(binary: string): Uint8Array {
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** UTF-8 text → standard Base64. */
export function textToBase64(text: string): string {
  return btoa(bytesToBinaryString(new TextEncoder().encode(text)));
}

/** True when `input` (whitespace stripped) is well-formed standard Base64. */
export function isValidBase64(input: string): boolean {
  const trimmed = input.replace(/\s+/g, "");
  if (trimmed.length === 0) return false;
  if (trimmed.length % 4 !== 0) return false;
  return BASE64_STANDARD.test(trimmed);
}

/** Standard Base64 → UTF-8 text. Throws on malformed input. */
export function base64ToText(input: string): string {
  const bytes = binaryStringToBytes(atob(input.replace(/\s+/g, "")));
  return new TextDecoder().decode(bytes);
}

/** Base64URL (as used in JWTs) → UTF-8 text. Throws on malformed input. */
export function base64UrlToText(segment: string): string {
  const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const bytes = binaryStringToBytes(atob(padded));
  return new TextDecoder().decode(bytes);
}
