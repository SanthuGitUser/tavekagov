import { Link, useLocation } from "react-router-dom";

import { findActiveVariants } from "@/components/layout/TopNav";
import { segmentedGroupClass, segmentedItemClass } from "@/lib/navStyles";
import { prefetchRoute } from "@/lib/routePrefetch";

/** Segmented switch between pages that share one section tab (e.g. Constituencies | MLAs). */
export function VariantSwitch() {
  const { pathname } = useLocation();
  const variants = findActiveVariants(pathname);
  if (!variants) return null;

  return (
    <nav className={segmentedGroupClass} aria-label="Switch view">
      {variants.map((variant) => {
        const active = pathname === variant.to || pathname.startsWith(`${variant.to}/`);
        return (
          <Link
            key={variant.to}
            to={variant.to}
            onMouseEnter={() => prefetchRoute(variant.to)}
            onFocus={() => prefetchRoute(variant.to)}
            className={segmentedItemClass(active)}
            aria-current={active ? "page" : undefined}
          >
            {variant.label}
          </Link>
        );
      })}
    </nav>
  );
}
