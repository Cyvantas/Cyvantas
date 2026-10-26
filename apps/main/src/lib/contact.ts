/**
 * Contact submission provider abstraction.
 *
 * The UI depends only on the `ContactProvider` interface, so the transport can
 * be swapped without touching the form.
 *
 * Production transport: the provider POSTs JSON to the same-origin
 * Vercel function at `/api/contact`. That URL is public by nature
 * (the browser must call it) and is NOT a secret. All email-service secrets
 * (API keys, SMTP credentials, etc.) live server-side in the serverless
 * function's own environment and are never bundled into the client.
 *
 * The server function uses Resend credentials configured only in Vercel.
 *
 * The legacy Blogger Apps Script endpoint is intentionally NOT used.
 *
 * ── Serverless endpoint contract ────────────────────────────────────────────
 * Request:  POST <VITE_CONTACT_ENDPOINT>
 *           Content-Type: application/json
 *           Body: ContactSubmission (see below)
 * Response: 200 with JSON `{ "ok": true }`  → delivery confirmed ("sent")
 *           2xx with JSON `{ "ok": false, "message"? }` → treated as error
 *           any non-2xx status → treated as error
 * The client only reports "sent" when the backend explicitly confirms; it never
 * fabricates success.
 */

export interface ContactSubmission {
  name: string;
  email: string;
  organization?: string;
  service?: string;
  timeline?: string;
  message: string;
}

export type ContactResultCode = "sent" | "not-configured" | "error";

export interface ContactResult {
  ok: boolean;
  code: ContactResultCode;
  message?: string;
}

export interface ContactProvider {
  readonly configured: boolean;
  submit(data: ContactSubmission): Promise<ContactResult>;
}

/** Opens a draft only; the visitor must review and send it in their email app. */
export function buildContactMailto(data: ContactSubmission, email: string): string {
  const body = [
    `Name: ${data.name}`,
    `Business email: ${data.email}`,
    ...(data.organization ? [`Organization: ${data.organization}`] : []),
    ...(data.service ? [`Service: ${data.service}`] : []),
    ...(data.timeline ? [`Timeline: ${data.timeline}`] : []),
    "",
    "Message & scope:",
    data.message,
  ].join("\n")
    // URI encoding rejects isolated UTF-16 surrogates. Unicode mode leaves
    // valid pairs (including emoji) intact and replaces only invalid units.
    .replace(/[\uD800-\uDFFF]/gu, "\uFFFD");
  return `mailto:${email}?subject=${encodeURIComponent("Security assessment enquiry — CYVANTAS")}&body=${encodeURIComponent(body)}`;
}

/**
 * Provider that POSTs the submission as JSON to a secure endpoint and only
 * reports success when the backend confirms delivery.
 */
export function createEndpointProvider(endpoint: string): ContactProvider {
  return {
    configured: true,
    async submit(data) {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!res.ok) {
          return { ok: false, code: "error", message: `Request failed (${res.status}).` };
        }

        // Require explicit confirmation from the backend before claiming "sent".
        const body = (await res.json().catch(() => null)) as
          | { ok?: boolean; message?: string }
          | null;

        if (body?.ok === true) {
          return { ok: true, code: "sent" };
        }

        return {
          ok: false,
          code: "error",
          message: body?.message ?? "Delivery was not confirmed. Please try again.",
        };
      } catch {
        return {
          ok: false,
          code: "error",
          message: "Network error — please try again or email us directly.",
        };
      }
    },
  };
}

/** Provider fallback for an explicitly empty endpoint override. */
const notConfiguredProvider: ContactProvider = {
  configured: false,
  async submit() {
    return { ok: false, code: "not-configured" };
  },
};

const endpoint = "/api/contact";

/** Active provider selected from environment configuration. */
export const contactProvider: ContactProvider =
  endpoint && endpoint.trim()
    ? createEndpointProvider(endpoint.trim())
    : notConfiguredProvider;
