/**
 * Structural hash-format identification. This inspects only length and
 * character set to suggest *possible* formats — it never cracks, reverses,
 * or looks anything up. Many formats share a shape (e.g. any 32-char hex
 * string could be MD5, MD4, or NTLM), so results are always "possible".
 */

export interface HashGuess {
  name: string;
  /** Optional caveat, e.g. shared length with another algorithm. */
  note?: string;
}

export interface HashIdentification {
  normalized: string;
  guesses: HashGuess[];
}

const HEX_ONLY = /^[0-9a-fA-F]+$/;

/** Prefixed formats are unambiguous enough to match on their signature. */
const PREFIXED: { test: RegExp; guess: HashGuess }[] = [
  { test: /^\$2[abxy]?\$\d{2}\$[./A-Za-z0-9]{53}$/, guess: { name: "bcrypt" } },
  { test: /^\$argon2(id|i|d)\$/, guess: { name: "Argon2" } },
  { test: /^\$6\$/, guess: { name: "sha512crypt ($6$)" } },
  { test: /^\$5\$/, guess: { name: "sha256crypt ($5$)" } },
  { test: /^\$1\$/, guess: { name: "md5crypt ($1$)" } },
  { test: /^\{SSHA\}/, guess: { name: "Salted SHA-1 (LDAP {SSHA})" } },
];

/** Hex-string length → candidate algorithms of that digest size. */
const HEX_BY_LENGTH: Record<number, HashGuess[]> = {
  32: [
    { name: "MD5" },
    { name: "MD4", note: "same length as MD5" },
    { name: "NTLM", note: "same length as MD5" },
  ],
  40: [{ name: "SHA-1" }, { name: "RIPEMD-160", note: "same length as SHA-1" }],
  56: [{ name: "SHA-224" }, { name: "SHA3-224", note: "same length as SHA-224" }],
  64: [{ name: "SHA-256" }, { name: "SHA3-256", note: "same length as SHA-256" }],
  96: [{ name: "SHA-384" }, { name: "SHA3-384", note: "same length as SHA-384" }],
  128: [{ name: "SHA-512" }, { name: "SHA3-512", note: "same length as SHA-512" }],
};

export function identifyHash(input: string): HashIdentification {
  const normalized = input.trim();
  if (normalized.length === 0) return { normalized, guesses: [] };

  for (const { test, guess } of PREFIXED) {
    if (test.test(normalized)) return { normalized, guesses: [guess] };
  }

  if (HEX_ONLY.test(normalized)) {
    const byLength = HEX_BY_LENGTH[normalized.length];
    if (byLength) return { normalized, guesses: byLength };
  }

  return { normalized, guesses: [] };
}
