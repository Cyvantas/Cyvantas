/**
 * Legal page content. The existing Blogger theme stores these pages as dynamic
 * post bodies (not in existing-blogger-theme.xml), so no finalized legal text
 * was available to port. The only verifiable source text is the Responsible
 * Disclosure notice from the theme, reused below. Privacy/Terms are structured
 * DRAFTS — clearly marked as such — describing only what this site actually
 * does (a static marketing site with a contact form). No invented claims.
 */
import { SITE } from "../config/site";

export interface LegalSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface LegalDoc {
  eyebrow: string;
  title: string;
  intro: string;
  /** Shown as a small notice: these are working drafts, not legal advice. */
  draftNote: string;
  sections: LegalSection[];
}

const DRAFT_NOTE =
  "This is a working draft provided for transparency. It is not legal advice and " +
  "may be revised. For questions, contact " + SITE.contactEmail + ".";

export const PRIVACY: LegalDoc = {
  eyebrow: "Legal",
  title: "Privacy Policy",
  intro:
    "This policy explains what information CYVANTAS collects through this website " +
    "and how it is used. CYVANTAS (" + SITE.url + ") is a cybersecurity company based in " +
    SITE.basedIn + ".",
  draftNote: DRAFT_NOTE,
  sections: [
    {
      heading: "Information we collect",
      paragraphs: [
        "This website is primarily a static marketing site. The only personal " +
          "information we actively collect is what you choose to submit through the " +
          "contact form.",
      ],
      bullets: [
        "Contact details you provide (such as your name and email address)",
        "The message content and any service or timeline selections you make",
      ],
    },
    {
      heading: "How we use your information",
      paragraphs: [
        "We only use the details you share through the contact form to respond to " +
          "your inquiry and to scope a potential engagement. Your information is never " +
          "sold or shared with third parties for marketing purposes.",
      ],
    },
    {
      heading: "Data retention",
      paragraphs: [
        "We retain contact inquiries only for as long as necessary to respond to and " +
          "follow up on your request. You may ask us to delete your inquiry at any time.",
      ],
    },
    {
      heading: "Your choices",
      paragraphs: [
        "You can contact us at " + SITE.contactEmail + " to request access to, " +
          "correction of, or deletion of any personal information you have shared with us.",
      ],
    },
    {
      heading: "Changes to this policy",
      paragraphs: [
        "We may update this policy as the website evolves. Material changes will be " +
          "reflected on this page.",
      ],
    },
    {
      heading: "Contact",
      paragraphs: [
        "Questions about this policy can be sent to " + SITE.contactEmail + ".",
      ],
    },
  ],
};

export const TERMS: LegalDoc = {
  eyebrow: "Legal",
  title: "Terms of Use",
  intro:
    "These terms govern your use of the CYVANTAS website at " + SITE.url + ". By using " +
    "this website, you agree to these terms.",
  draftNote: DRAFT_NOTE,
  sections: [
    {
      heading: "Use of this website",
      paragraphs: [
        "This website provides information about CYVANTAS and its cybersecurity " +
          "services, along with security research and educational material. You agree " +
          "to use it lawfully and not to attempt to disrupt or compromise the site or " +
          "its infrastructure.",
      ],
    },
    {
      heading: "Authorized and educational use only",
      paragraphs: [
        "Any security techniques, tooling, or research referenced on this site are " +
          "intended for authorized, educational, and defensive purposes only. Never " +
          "test systems you do not own or do not have explicit permission to assess.",
      ],
    },
    {
      heading: "No warranty",
      paragraphs: [
        "This website and its content are provided \u201cas is\u201d without warranties " +
          "of any kind. We do not guarantee that the site will be uninterrupted, " +
          "error-free, or that the information is complete or current.",
      ],
    },
    {
      heading: "Limitation of liability",
      paragraphs: [
        "To the extent permitted by law, CYVANTAS is not liable for any damages " +
          "arising from your use of, or inability to use, this website or any content " +
          "or resource linked from it.",
      ],
    },
    {
      heading: "Intellectual property",
      paragraphs: [
        "The CYVANTAS name, branding, and original content on this site are the " +
          "property of CYVANTAS unless otherwise noted. Third-party frameworks and " +
          "resources referenced on this site remain the property of their respective " +
          "owners, and referencing them does not imply affiliation or endorsement.",
      ],
    },
    {
      heading: "External links",
      paragraphs: [
        "This website may link to external sites and resources that we do not control. " +
          "We are not responsible for their content or availability.",
      ],
    },
    {
      heading: "Governing law",
      paragraphs: [
        "These terms are governed by the laws of " + SITE.basedIn + ".",
      ],
    },
    {
      heading: "Changes to these terms",
      paragraphs: [
        "We may update these terms from time to time. Continued use of the website " +
          "constitutes acceptance of the current terms.",
      ],
    },
    {
      heading: "Contact",
      paragraphs: [
        "Questions about these terms can be sent to " + SITE.contactEmail + ".",
      ],
    },
  ],
};

export const RESPONSIBLE_DISCLOSURE: LegalDoc = {
  eyebrow: "Legal",
  title: "Responsible Disclosure",
  intro:
    "Research is published for educational and defensive purposes, and vulnerabilities " +
    "are reported to affected vendors before publication where applicable. Never test " +
    "systems without explicit authorization.",
  draftNote: DRAFT_NOTE,
  sections: [
    {
      heading: "Reporting a vulnerability",
      paragraphs: [
        "If you believe you have found a security vulnerability affecting CYVANTAS or " +
          "this website, please report it privately by email to " + SITE.contactEmail + " " +
          "before disclosing it publicly.",
      ],
    },
    {
      heading: "What to include",
      bullets: [
        "A clear description of the issue and its potential impact",
        "Steps to reproduce, including any relevant URLs or requests",
        "Any proof-of-concept material, kept minimal and non-destructive",
      ],
    },
    {
      heading: "Our commitment",
      paragraphs: [
        "We will acknowledge legitimate reports, investigate promptly, and keep you " +
          "informed of our progress. We aim to coordinate on timing before any public " +
          "disclosure.",
      ],
    },
    {
      heading: "Guidelines for testing",
      paragraphs: [
        "When investigating an issue, please act in good faith: avoid privacy " +
          "violations, data destruction, service degradation, and any access beyond " +
          "what is necessary to demonstrate the vulnerability. Only test systems you " +
          "are explicitly authorized to test.",
      ],
    },
    {
      heading: "Contact",
      paragraphs: [
        "Security reports can be sent to " + SITE.contactEmail + ".",
      ],
    },
  ],
};
