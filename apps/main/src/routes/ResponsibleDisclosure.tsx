import { Seo } from "../components/seo/Seo";
import { ROUTE_SEO } from "../config/seo";
import { LegalDocView } from "../components/sections/LegalDoc";
import { RESPONSIBLE_DISCLOSURE } from "../content/legal";

/** Responsible Disclosure page. */
export function ResponsibleDisclosure() {
  return (
    <>
      <Seo {...ROUTE_SEO.responsibleDisclosure} />
      <LegalDocView doc={RESPONSIBLE_DISCLOSURE} />
    </>
  );
}
