import assert from "node:assert/strict";
import { test } from "node:test";
import { buildContactMailto, contactProvider, createEndpointProvider } from "../src/lib/contact.ts";

const submission = {
  name: "Amal & Co",
  email: "amal+security@example.org",
  organization: "أمان / Security",
  service: "API Security Testing",
  timeline: "1–3 months",
  message: "Review /v1/orders?owner=a&role=b\nKeep +, # and Unicode: سلام",
};

test("email drafts retain the entered scope without introducing extra recipients or query parameters", () => {
  const draft = new URL(buildContactMailto(submission, "support@cyvantas.in"));
  assert.equal(draft.protocol, "mailto:");
  assert.equal(draft.pathname, "support@cyvantas.in");
  assert.deepEqual([...draft.searchParams.keys()], ["subject", "body"]);
  const body = draft.searchParams.get("body")!;
  for (const value of Object.values(submission)) assert.ok(body.includes(value));
  assert.ok(draft.searchParams.get("subject")!.includes("Security assessment"));
});

test("email drafts omit optional fields without leaking undefined values", () => {
  const draft = new URL(buildContactMailto({ name: "Amal", email: submission.email, message: "Assess our API." }, "support@cyvantas.in"));
  const body = draft.searchParams.get("body")!;
  assert.ok(!body.includes("Organization:"));
  assert.ok(!body.includes("undefined"));
  assert.ok(body.includes("Assess our API."));
});

test("email drafts repair isolated UTF-16 surrogates without changing valid Unicode", () => {
  const draft = new URL(buildContactMailto({
    ...submission,
    name: "Amal\uD800",
    organization: "\uDC00Security",
    message: "Keep 🛡️ and سلام; repair \uD800 / \uDC00.",
  }, "support@cyvantas.in"));
  assert.deepEqual([...draft.searchParams.keys()], ["subject", "body"]);
  const body = draft.searchParams.get("body")!;
  assert.ok(body.includes("Name: Amal\uFFFD"));
  assert.ok(body.includes("Organization: \uFFFDSecurity"));
  assert.ok(body.includes("Keep 🛡️ and سلام; repair \uFFFD / \uFFFD."));
});

test("the default provider uses the same-origin contact function", async (context) => {
  const fetchMock = context.mock.method(globalThis, "fetch", async () => { throw new Error("Unexpected request"); });
  assert.equal(contactProvider.configured, true);
  assert.deepEqual(await contactProvider.submit(submission), { ok: false, code: "error", message: "Network error — please try again or email us directly." });
  assert.equal(fetchMock.mock.calls[0].arguments[0], "/api/contact");
});

test("a configured endpoint reports delivery only on explicit confirmation", async (context) => {
  const fetchMock = context.mock.method(globalThis, "fetch", async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
  const provider = createEndpointProvider("https://contact.example.org/assessment");
  assert.equal(provider.configured, true);
  assert.deepEqual(await provider.submit(submission), { ok: true, code: "sent" });
  const [url, options] = fetchMock.mock.calls[0].arguments;
  assert.equal(url, "https://contact.example.org/assessment");
  assert.equal(options?.method, "POST");
  assert.deepEqual(JSON.parse(options?.body as string), submission);
});

for (const [name, response] of [
  ["unconfirmed success status", () => new Response("{}", { status: 200 })],
  ["explicit rejection", () => new Response('{"ok":false}', { status: 200 })],
  ["invalid response JSON", () => new Response("not JSON", { status: 200 })],
  ["HTTP error", () => new Response("failure", { status: 503 })],
] as const) {
  test(`endpoint ${name} never produces a successful submission`, async (context) => {
    context.mock.method(globalThis, "fetch", async () => response());
    const result = await createEndpointProvider("https://contact.example.org/assessment").submit(submission);
    assert.equal(result.ok, false);
    assert.equal(result.code, "error");
  });
}

test("network failure returns an error instead of claiming delivery", async (context) => {
  context.mock.method(globalThis, "fetch", async () => { throw new Error("offline"); });
  const result = await createEndpointProvider("https://contact.example.org/assessment").submit(submission);
  assert.equal(result.ok, false);
  assert.equal(result.code, "error");
});
