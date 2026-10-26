import { useId, useState, type ChangeEvent, type FormEvent } from "react";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";
import { Select } from "../ui/Select";
import { Button } from "../ui/Button";
import { CONTACT } from "../../content/home";
import { buildContactMailto, contactProvider, type ContactResult } from "../../lib/contact";

interface Errors {
  name?: string;
  email?: string;
  message?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const toOptions = (values: readonly string[]) =>
  values.map((v) => ({ label: v, value: v }));

export function ContactForm() {
  const hpId = useId();
  const [values, setValues] = useState({
    name: "",
    email: "",
    organization: "",
    service: CONTACT.services[0],
    timeline: CONTACT.timelines[0],
    message: "",
    website: "", // honeypot
  });
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "done">("idle");
  const [result, setResult] = useState<ContactResult | null>(null);
  const [draftReady, setDraftReady] = useState(false);

  const set = (key: keyof typeof values) => (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    setValues((prev) => ({ ...prev, [key]: e.target.value }));
    setDraftReady(false);
    setResult(null);
  };

  const validate = (): boolean => {
    const next: Errors = {};
    if (!values.name.trim()) next.name = "Please enter your name.";
    if (!values.email.trim()) next.email = "Please enter your email.";
    else if (!EMAIL_RE.test(values.email.trim())) next.email = "Please enter a valid email.";
    if (!values.message.trim()) next.message = "Please describe your scope.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Prevent duplicate submissions while a request is in flight.
    if (status === "submitting") return;
    // Silently discard honeypot submissions; never fabricate delivery.
    if (values.website) return;
    if (!validate()) return;

    setStatus("submitting");
    const res = await contactProvider.submit({
      name: values.name.trim(),
      email: values.email.trim(),
      organization: values.organization.trim() || undefined,
      service: values.service,
      timeline: values.timeline,
      message: values.message.trim(),
    });
    setResult(res);
    setDraftReady(!res.ok);
    setStatus("done");
  };

  const succeeded = status === "done" && result?.ok && result.code === "sent";
  const emailDraft = buildContactMailto({
    name: values.name.trim(),
    email: values.email.trim(),
    organization: values.organization.trim(),
    service: values.service,
    timeline: values.timeline,
    message: values.message.trim(),
  }, CONTACT.email);

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
      {!contactProvider.configured && (
        <p className="text-sm text-foreground">
          Prepare an email draft with your assessment details. Review and send it from
          your email app, or email <a className="text-accent underline underline-offset-2" href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a> directly.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Name"
          name="name"
          disabled={status === "submitting"}
          autoComplete="name"
          maxLength={120}
          required
          value={values.name}
          onChange={set("name")}
          error={errors.name}
        />
        <Input
          label="Business email"
          name="email"
          disabled={status === "submitting"}
          type="email"
          autoComplete="email"
          maxLength={160}
          required
          value={values.email}
          onChange={set("email")}
          error={errors.email}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Organization"
          name="organization"
          disabled={status === "submitting"}
          autoComplete="organization"
          maxLength={120}
          value={values.organization}
          onChange={set("organization")}
        />
        <Select
          label="Service"
          name="service"
          disabled={status === "submitting"}
          options={toOptions(CONTACT.services)}
          value={values.service}
          onChange={set("service")}
        />
      </div>

      <Select
        label="Timeline"
        name="timeline"
        disabled={status === "submitting"}
        options={toOptions(CONTACT.timelines)}
        value={values.timeline}
        onChange={set("timeline")}
      />

      <Textarea
        label="Message & scope"
        name="message"
        disabled={status === "submitting"}
        rows={5}
        maxLength={4000}
        required
        value={values.message}
        onChange={set("message")}
        error={errors.message}
      />

      {/* Honeypot: hidden from users and assistive tech; bots tend to fill it. */}
      <div aria-hidden="true" className="sr-only">
        <label htmlFor={hpId}>Leave this field empty</label>
        <input
          id={hpId}
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={values.website}
          onChange={set("website")}
        />
      </div>

      <div className="flex flex-col gap-3">
        <Button type="submit" disabled={status === "submitting"} className="self-start">
          {status === "submitting"
            ? (contactProvider.configured ? "Sending…" : "Preparing draft…")
            : (contactProvider.configured ? "Request Security Assessment" : "Prepare email draft")}
        </Button>

        <p role="status" aria-live="polite" className="text-sm">
          {succeeded && (
            <span className="text-accent-secondary">
              Thanks — your request has been received. We&rsquo;ll be in touch.
            </span>
          )}
          {status === "done" && !result?.ok && result?.code === "not-configured" && (
            <span className="text-muted">
              Your draft is ready. Nothing has been sent. Open it in your email app,
              review the details and send it when you are ready.
            </span>
          )}
          {status === "done" && !result?.ok && result?.code === "error" && (
            <span className="text-danger">
              {result.message ?? "Something went wrong. Please try again."}
            </span>
          )}
        </p>
        {draftReady && (
          <a href={emailDraft} className="inline-flex min-h-11 self-start items-center rounded-md border border-accent px-5 font-medium text-accent hover:text-foreground">
            Open email draft
          </a>
        )}
      </div>
    </form>
  );
}
