import { Container } from "../ui/Container";
import { Divider } from "../ui/Divider";
import { Logo } from "./Logo";

/**
 * Placeholder footer. Real link columns, legal, and disclosure content land in
 * later phases; this establishes the landmark and shell spacing.
 */
export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border bg-surface/40">
      <Container className="py-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <Logo />
          <p className="text-caption">Security beyond the surface.</p>
        </div>
        <Divider className="my-6" />
        <p className="text-caption">
          &copy; {year} CYVANTAS. Based in India. For authorized security testing only.
        </p>
      </Container>
    </footer>
  );
}
