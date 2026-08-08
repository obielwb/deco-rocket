/**
 * Search form. Submits to /s?q=<term>; as the user types, suggestions are
 * fetched via HTMX (kept for now — the suggestions migration is its own task).
 *
 * Cmd/Ctrl+K is owned by the header search modal (see SearchModal.tsx), the
 * primary search entry point — a second listener here made one keypress open
 * both the side drawer and the modal.
 */
import { useId, useRef } from "react";
import { Suggestion } from "@decocms/apps-commerce/types";
import { SEARCHBAR_INPUT_FORM_ID } from "../../../constants";
import { useComponent } from "../../../sections/Component";
import Icon from "../../ui/Icon";
import { Props as SuggestionProps } from "./Suggestions";
import type { SearchModalLabels } from "../SearchModal";
import { asResolved } from "~/types/deco";
import { type Resolved } from "~/types/deco";

// When user clicks on the search button, navigate it to
export const ACTION = "/s";
// Querystring param used when navigating the user
export const NAME = "q";

export interface SearchbarProps {
  /**
   * @title Placeholder
   * @description Search bar default placeholder message
   * @default O que você está procurando?
   */
  placeholder?: string;
  /**
   * @title Search modal labels
   * @description Copy shown inside the header search modal
   *
   * Not read by `Searchbar` itself: it lives here so the whole search copy set
   * (placeholder + modal strings) is one group in the CMS, and Header forwards
   * it to `SearchModal`.
   */
  labels?: SearchModalLabels;
  /** @description Loader to run when suggesting new elements */
  loader: Resolved<Suggestion | null>;
}

const Suggestions = "./Suggestions.tsx";

export default function Searchbar({
  placeholder = "O que você está procurando?",
  loader,
}: SearchbarProps) {
  const slot = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const onSubmit = () => {
    const term = inputRef.current?.value;
    if (term) {
      // `dispatch` exists at runtime (set up by the framework's DECO.events
      // bootstrap), but @decocms/apps' ambient Window.DECO type only declares
      // `subscribe`. Cast through the real shape to dispatch programmatically.
      const events = window.DECO?.events as unknown as
        { dispatch?: (event: unknown) => void } | undefined;
      events?.dispatch?.({
        name: "search",
        params: { search_term: term },
      });
    }
  };

  return (
    <div className="w-full grid gap-8 px-4 py-6" style={{ gridTemplateRows: "min-content auto" }}>
      <form
        id={SEARCHBAR_INPUT_FORM_ID}
        action={ACTION}
        className="flex items-center gap-3"
        onSubmit={onSubmit}
      >
        <button
          type="submit"
          className="btn btn-ghost btn-square no-animation shrink-0"
          aria-label="Buscar"
          form={SEARCHBAR_INPUT_FORM_ID}
          tabIndex={-1}
        >
          <span className="loading loading-spinner loading-xs hidden [.htmx-request_&]:inline" />
          <Icon id="search" className="inline [.htmx-request_&]:hidden" />
        </button>
        <input
          ref={inputRef}
          autoFocus
          tabIndex={0}
          className="grow border-0 border-b border-ink/15 bg-transparent pb-2 text-base text-ink outline-none placeholder:text-muted focus:border-ink/40"
          name={NAME}
          placeholder={placeholder}
          autoComplete="off"
          hx-target={`#${slot}`}
          hx-post={
            loader &&
            useComponent<SuggestionProps>(Suggestions, {
              loader: asResolved(loader),
            })
          }
          hx-trigger={`input changed delay:300ms, ${NAME}`}
          hx-indicator={`#${SEARCHBAR_INPUT_FORM_ID}`}
          hx-swap="innerHTML"
        />
      </form>

      {/* Suggestions slot */}
      <div id={slot} />
    </div>
  );
}
