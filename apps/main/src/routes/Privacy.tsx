import { Seo } from "../components/seo/Seo";
import { ROUTE_SEO } from "../config/seo";
import { LegalDocView } from "../components/sections/LegalDoc";
import { PRIVACY } from "../content/legal";

/** Privacy Policy page. */
export function Privacy() {
  return (
    <>
      <Seo {...ROUTE_SEO.privacy} />
      <LegalDocView doc={PRIVACY} />
    </>
  );
}
