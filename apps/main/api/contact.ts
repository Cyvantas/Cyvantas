import type { IncomingMessage, ServerResponse } from "node:http";

type ContactBody = {
  name?: unknown;
  email?: unknown;
  organization?: unknown;
  service?: unknown;
  timeline?: unknown;
  message?: unknown;
  website?: unknown;
};

const json = (res: ServerResponse, status: number, body: object) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
};

export default async function handler(req: IncomingMessage & { body?: ContactBody }, res: ServerResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { ok: false, message: "Method not allowed." });
  }

  const body = req.body;
  if (!body || typeof body !== "object") return json(res, 400, { ok: false, message: "Invalid request." });
  // Bot trap: discard quietly without contacting the mail provider.
  if (typeof body.website === "string" && body.website) return json(res, 200, { ok: true });

  const { name, email, organization, service, timeline, message } = body;
  if (
    typeof name !== "string" || !name.trim() || name.length > 120 ||
    typeof email !== "string" || email.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
    typeof message !== "string" || !message.trim() || message.length > 4000 ||
    (organization !== undefined && (typeof organization !== "string" || organization.length > 120)) ||
    (service !== undefined && (typeof service !== "string" || service.length > 120)) ||
    (timeline !== undefined && (typeof timeline !== "string" || timeline.length > 80))
  ) return json(res, 400, { ok: false, message: "Please check the form fields and try again." });

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_EMAIL_FROM;
  if (!apiKey || !from) return json(res, 503, { ok: false, message: "Contact email is not configured yet. Please email support@cyvantas.in directly." });

  const text = [
    `Name: ${name.trim()}`,
    `Business email: ${email.trim()}`,
    ...(organization?.trim() ? [`Organization: ${organization.trim()}`] : []),
    ...(service?.trim() ? [`Service: ${service.trim()}`] : []),
    ...(timeline?.trim() ? [`Timeline: ${timeline.trim()}`] : []),
    "",
    "Message & scope:",
    message.trim(),
  ].join("\n");

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: ["support@cyvantas.in"],
        reply_to: email.trim(),
        subject: `Security assessment enquiry — ${name.trim().slice(0, 100)}`,
        text,
      }),
    });
    if (!response.ok) return json(res, 502, { ok: false, message: "Email delivery failed. Please try again or email support@cyvantas.in directly." });
    return json(res, 200, { ok: true });
  } catch {
    return json(res, 502, { ok: false, message: "Email delivery failed. Please try again or email support@cyvantas.in directly." });
  }
}
