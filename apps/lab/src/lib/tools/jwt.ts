import type { ToolResult } from "./result";
import { ok, err } from "./result";
import { base64UrlToText } from "./encoding";

/** A JWT registered claim that carries a NumericDate (seconds since epoch). */
export interface JwtTimestamp {
  claim: "exp" | "iat" | "nbf";
  label: string;
  seconds: number;
  iso: string;
  /** exp/nbf only: whether the token is currently expired / not-yet-valid. */
  state?: "expired" | "not-yet-valid" | "active";
}

export interface DecodedJwt {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  /** Raw third segment. Present but never verified — this is inspection only. */
  signature: string;
  algorithm: string | null;
  type: string | null;
  timestamps: JwtTimestamp[];
}

const TIMESTAMP_CLAIMS: { claim: JwtTimestamp["claim"]; label: string }[] = [
  { claim: "iat", label: "Issued at" },
  { claim: "nbf", label: "Not before" },
  { claim: "exp", label: "Expires" },
];

/**
 * Decode (NOT verify) a JWT. Splits the three segments, Base64URL-decodes the
 * header and payload, and extracts the algorithm and any NumericDate claims.
 * The signature is never checked — this tool inspects structure only.
 */
export function decodeJwt(input: string): ToolResult<DecodedJwt> {
  const token = input.trim();
  if (token.length === 0) return err("Paste a JWT to decode.");

  const segments = token.split(".");
  if (segments.length !== 3) {
    return err("A JWT must have three dot-separated segments (header.payload.signature).");
  }

  const header = parseSegment(segments[0], "header");
  if (!header.ok) return header;
  const payload = parseSegment(segments[1], "payload");
  if (!payload.ok) return payload;

  const algorithm = readString(header.value, "alg");
  const type = readString(header.value, "typ");

  return ok({
    header: header.value,
    payload: payload.value,
    signature: segments[2],
    algorithm,
    type,
    timestamps: collectTimestamps(payload.value),
  });
}

function parseSegment(
  segment: string,
  name: "header" | "payload",
): ToolResult<Record<string, unknown>> {
  let json: string;
  try {
    json = base64UrlToText(segment);
  } catch {
    return err(`Malformed JWT: the ${name} is not valid Base64URL.`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return err(`Malformed JWT: the ${name} is not valid JSON.`);
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return err(`Malformed JWT: the ${name} is not a JSON object.`);
  }
  return ok(parsed as Record<string, unknown>);
}

function readString(source: Record<string, unknown>, key: string): string | null {
  const value = source[key];
  return typeof value === "string" ? value : null;
}

function collectTimestamps(payload: Record<string, unknown>): JwtTimestamp[] {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const result: JwtTimestamp[] = [];
  for (const { claim, label } of TIMESTAMP_CLAIMS) {
    const raw = payload[claim];
    if (typeof raw !== "number" || !Number.isFinite(raw)) continue;
    const seconds = Math.trunc(raw);
    result.push({
      claim,
      label,
      seconds,
      iso: new Date(seconds * 1000).toISOString(),
      state: claimState(claim, seconds, nowSeconds),
    });
  }
  return result;
}

function claimState(
  claim: JwtTimestamp["claim"],
  seconds: number,
  nowSeconds: number,
): JwtTimestamp["state"] {
  if (claim === "exp") return seconds < nowSeconds ? "expired" : "active";
  if (claim === "nbf") return seconds > nowSeconds ? "not-yet-valid" : "active";
  return undefined;
}
