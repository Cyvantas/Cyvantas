import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * Route scroll restoration. On forward/link (PUSH/REPLACE) navigations, jumps
 * to the top of the new page — or to the hash target if present. On POP (back/
 * forward) it defers to the browser's native scroll restoration. Renders nothing.
 */
export function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    if (navigationType === "POP") return;

    if (hash) {
      const target = document.getElementById(hash.slice(1));
      if (target) {
        target.scrollIntoView();
        return;
      }
    }

    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname, hash, navigationType]);

  return null;
}
