import { useId, useState, type ChangeEvent, type FormEvent } from "react";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";
import { Select } from "../ui/Select";
import { Button } from "../ui/Button";
import { CONTACT } from "../../content/home";
import { contactProvider, type ContactResult } from "../../lib/contact";

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

  const set = (key: keyof typeof values) => (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => setValues((prev) => ({ ...prev, [key]: e.target.value }));

  const validate = (): boolean => {
    const next: Errors = {};
    if (!values.name.trim()) next.name = "Please enter your name.";
    if (!values.email.trim()) next.email = "Please enter your email.";
    else if (!EMAIL_RE.test(values.email)) next.email = "Please enter a valid email.";
    if (!values.message.trim()) next.message = "Please describe your scope.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Prevent duplicate submissions while a request is in flight.
    if (status === "submitting") return;
    // Silently succeed if the honeypot is filled (likely a bot).
    if (values.website) {
      setStatus("done");
      setResult({ ok: true, code: "sent" });
      return;
    }
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
    setStatus("done");
  };

  const succeeded = status === "done" && result?.ok;

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Name"
          name="name"
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
          autoComplete="organization"
          maxLength={120}
          value={values.organization}
          onChange={set("organization")}
        />
        <Select
          label="Service"
          name="service"
          options={toOptions(CONTACT.services)}
          value={values.service}
          onChange={set("service")}
        />
      </div>

      <Select
        label="Timeline"
        name="timeline"
        options={toOptions(CONTACT.timelines)}
        value={values.timeline}
        onChange={set("timeline")}
      />

      <Textarea
        label="Message & scope"
        name="message"
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
          {status === "submitting" ? "Sending…" : "Request Security Assessment"}
        </Button>

        <p role="status" aria-live="polite" className="text-sm">
          {succeeded && (
            <span className="text-accent-secondary">
              Thanks — your request has been received. We&rsquo;ll be in touch.
            </span>
          )}
          {status === "done" && !result?.ok && result?.code === "not-configured" && (
            <span className="text-muted">
              Submissions aren&rsquo;t wired to a backend yet. Please email us at{" "}
              <a
                href={`mailto:${CONTACT.email}`}
                className="text-accent underline underline-offset-2"
              >
                {CONTACT.email}
              </a>
              .
            </span>
          )}
          {status === "done" && !result?.ok && result?.code === "error" && (
            <span className="text-danger">
              {result.message ?? "Something went wrong. Please try again."}
            </span>
          )}
        </p>
      </div>
    </form>
  );
}
