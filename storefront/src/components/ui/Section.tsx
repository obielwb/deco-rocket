import React from "react";
import { JSX } from "react";
import { clx } from "~/sdk/clx";
import Icon from "./Icon";

export interface Props {
  /** @description Section title */
  title?: string;

  /** @description See all link */
  cta?: string;
}

function Header({ title, cta }: Props) {
  if (!title) {
    return null;
  }

  return (
    <div className="flex items-end justify-between gap-2">
      <h2 className="text-display font-medium text-ink">{title}</h2>
      {cta && (
        <a
          className="tap-scale flex items-center gap-1 text-sm text-ink-soft transition-colors duration-(--duration-fast) hover:text-ink"
          href={cta}
        >
          See all
          <Icon id="chevron-right" size={12} />
        </a>
      )}
    </div>
  );
}

interface Tab {
  title: string;
}

function Tabbed({ children }: { children: JSX.Element }) {
  return <>{children}</>;
}

function Container({ className: _class, ...props }: React.JSX.IntrinsicElements["div"]) {
  return (
    <div
      {...props}
      className={clx(
        "flex w-full flex-col gap-6 px-3 py-8 sm:py-14",
        _class?.toString(),
      )}
    />
  );
}

function Placeholder({ height, className: _class }: { height: string; className?: string }) {
  return (
    <div
      style={{
        height,
        containIntrinsicSize: height,
        contentVisibility: "auto",
      }}
      className={clx("flex justify-center items-center", _class)}
    >
      <span className="loading loading-spinner" />
    </div>
  );
}

function Section() {}

Section.Container = Container;
Section.Header = Header;
Section.Tabbed = Tabbed;
Section.Placeholder = Placeholder;

export default Section;
