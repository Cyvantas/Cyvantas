import { Seo } from "../components/seo/Seo";
import { ROUTE_SEO } from "../config/seo";
import { LegalDocView } from "../components/sections/LegalDoc";
import { TERMS } from "../content/legal";

/** Terms of Use page. */
export function Terms() {
  return (
    <>
      <Seo {...ROUTE_SEO.terms} />
      <LegalDocView doc={TERMS} />
    </>
  );
}
