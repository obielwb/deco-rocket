import { Link } from "@tanstack/react-router";
import { useUser } from "../../platform/user";
import Button from "../ui/Button";
import Icon from "../ui/Icon";

interface Props {
  variant: "mobile" | "desktop";
}

const MOBILE_ICON_CLASS =
  "tap-scale flex size-10 items-center justify-center rounded-sm text-ink transition-colors duration-(--duration-fast) hover:bg-white/60";

/**
 * Desktop renders the Figma "Action button" — plain text pill: "Account" or
 * "Sign in". Mobile has no room for a text pill next to the logo and cart, so
 * it renders an icon-only button matching the menu/search icons instead.
 *
 * Both variants take their accessible name from the same `label`, so the
 * icon-only button announces exactly the wording the desktop pill shows
 * ("Sign in", matching the /login page) — WCAG 2.5.3 Label in Name.
 */
function SignIn({ variant }: Props) {
  const { isAuthenticated } = useUser();
  const href = isAuthenticated ? "/account" : "/login";
  const label = isAuthenticated ? "Account" : "Sign in";

  if (variant === "mobile") {
    return (
      <Link to={href} aria-label={label} preload="intent" className={MOBILE_ICON_CLASS}>
        <Icon id="account_circle" size={18} />
      </Link>
    );
  }

  return (
    <Button href={href} size="md">
      {label}
    </Button>
  );
}

export default SignIn;
