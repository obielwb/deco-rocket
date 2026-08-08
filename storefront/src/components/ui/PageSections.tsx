import { DecoPageRenderer } from "@decocms/tanstack";
import type { DeferredSection, ResolvedSection } from "@decocms/blocks/cms";
import type { Device } from "@decocms/blocks/sdk/useDevice";
import { mainBounds } from "./splitPageSections";

/**
 * Wraps the CMS page content in a `<main>` landmark.
 *
 * The CMS section list is flat and already contains the Header (`role=banner`)
 * and Footer (`role=contentinfo`) sections, so we can't wrap the whole list in
 * `<main>` — that would nest those landmarks and stop them from being
 * top-level. Instead we split the list into the landmark sections that lead
 * and trail the page and render everything in between inside `<main>`, so no
 * page content is left outside a landmark region.
 *
 * The ordering logic lives in `./splitPageSections` and is unit tested there.
 */

type LoadDeferredSectionFn = (data: {
  component: string;
  rawProps?: Record<string, unknown>;
  pagePath: string;
  pageUrl?: string;
  index?: number;
}) => Promise<ResolvedSection | null>;

interface Props {
  sections: ResolvedSection[];
  deferredSections?: DeferredSection[];
  deferredPromises?: Record<string, Promise<ResolvedSection | null>>;
  pagePath?: string;
  pageUrl?: string;
  /**
   * Server-resolved device. Forwarded to every `DecoPageRenderer` — omitting it
   * makes `useDevice()` re-resolve on the client and causes React #418
   * hydration mismatches.
   */
  device?: Device;
  loadDeferredSectionFn?: LoadDeferredSectionFn;
}

export default function PageSections({
  sections,
  deferredSections,
  deferredPromises,
  pagePath,
  pageUrl,
  device,
  loadDeferredSectionFn,
}: Props) {
  const eager = sections ?? [];
  const deferred = deferredSections ?? [];

  // Position of every section in the original CMS order.
  const positioned = [
    ...eager.map((s, i) => ({ s, pos: s?.index ?? i })),
    ...deferred.map((s, i) => ({ s, pos: s?.index ?? eager.length + i })),
  ];

  const pick = (from: number, to: number) => ({
    sections: eager.filter((s, i) => {
      const pos = s?.index ?? i;
      return pos >= from && pos <= to;
    }),
    deferredSections: deferred.filter((s, i) => {
      const pos = s?.index ?? eager.length + i;
      return pos >= from && pos <= to;
    }),
  });

  type Group = ReturnType<typeof pick>;

  const render = (group: Group) =>
    group.sections.length || group.deferredSections.length ? (
      <DecoPageRenderer
        sections={group.sections}
        deferredSections={group.deferredSections}
        deferredPromises={deferredPromises}
        pagePath={pagePath}
        pageUrl={pageUrl}
        device={device}
        loadDeferredSectionFn={loadDeferredSectionFn}
      />
    ) : null;

  const bounds = mainBounds(positioned);

  // No content sections: nothing to wrap.
  if (!bounds) return render({ sections: eager, deferredSections: deferred });

  return (
    <>
      {render(pick(-Infinity, bounds.first - 1))}
      <main id="main-content">{render(pick(bounds.first, bounds.last))}</main>
      {render(pick(bounds.last + 1, Infinity))}
    </>
  );
}
