import { RootLayout } from "./components/layout/RootLayout";
import { SectionTitle } from "./components/ui/SectionTitle";
import { StatusDot } from "./components/ui/StatusDot";

/**
 * Phase 0 placeholder. The design-system foundation and app shell are in
 * place; homepage content is built in later phases.
 */
function App() {
  return (
    <RootLayout>
      <SectionTitle
        eyebrow="Phase 0 — Foundations"
        title="Design system & UI foundation ready"
        description="Tokens, primitives, motion presets, and the application shell are in place. Page content is built in subsequent phases."
      />
      <div className="mt-6">
        <StatusDot status="online" pulse label="Foundation online" />
      </div>
    </RootLayout>
  );
}

export default App;
