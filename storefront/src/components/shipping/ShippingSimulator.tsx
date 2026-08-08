import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { formatPrice } from "@decocms/apps-commerce/sdk/formatPrice";
import { invoke } from "../../runtime";
import type { ShippingMethod, ShippingSimulation } from "../../actions/shipping/simulate";
import Button from "../ui/Button";

export interface PostalCodeFormat {
  /** Mask digits for display (e.g. "12345-678"). Default: identity. */
  format?: (digits: string) => string;
  /** Maximum input length after formatting. Default: 12. */
  maxLength?: number;
  /** Minimum digits required to enable submit. Default: 4. */
  minDigits?: number;
  /** Maximum digits accepted. Default: 10. */
  maxDigits?: number;
  /** Visible placeholder. Default: "Postal code". */
  placeholder?: string;
  /** Accessible label for the input. Default: "Postal code". */
  ariaLabel?: string;
}

export interface ShippingCopy {
  /** @default "Enter your postal code to estimate delivery time." */
  helper?: string;
  /** @default "Calculate" */
  submit?: string;
  /** @default "Free" */
  free?: string;
  /** @default "Delivery times start after payment confirmation." */
  footer?: string;
  /** Singular delivery-time label. @default "business day" */
  daySingular?: string;
  /** Plural delivery-time label. @default "business days" */
  dayPlural?: string;
  /** Prefix shown before the day count. @default "up to" */
  upToLabel?: string;
}

export interface Props {
  postalCode?: PostalCodeFormat;
  copy?: ShippingCopy;
  /** Locale passed to Intl.NumberFormat. Default: browser locale. */
  locale?: string;
}

const identity = (s: string) => s;

function MethodRow({
  method,
  copy,
  locale,
}: {
  method: ShippingMethod;
  copy: Required<ShippingCopy>;
  locale?: string;
}) {
  return (
    <li className="flex items-center justify-between gap-4 border-gray-200 py-2 not-first:border-t">
      <span className="text-sm text-ink-soft">{method.name}</span>
      <span className="text-xs text-muted">
        {copy.upToLabel} {method.days} {method.days === 1 ? copy.daySingular : copy.dayPlural}
      </span>
      <span className="text-right text-sm font-medium text-ink-soft">
        {method.price === 0 ? copy.free : formatPrice(method.price, method.currency, locale)}
      </span>
    </li>
  );
}

export default function ShippingSimulator({ postalCode = {}, copy = {}, locale }: Props) {
  const {
    format = identity,
    maxLength = 12,
    minDigits = 4,
    maxDigits = 10,
    placeholder = "Postal code",
    ariaLabel = "Postal code",
  } = postalCode;

  const resolvedCopy: Required<ShippingCopy> = {
    helper: copy.helper ?? "Enter your postal code to estimate delivery time.",
    submit: copy.submit ?? "Calculate",
    free: copy.free ?? "Free",
    footer: copy.footer ?? "Delivery times start after payment confirmation.",
    daySingular: copy.daySingular ?? "business day",
    dayPlural: copy.dayPlural ?? "business days",
    upToLabel: copy.upToLabel ?? "up to",
  };

  const [value, setValue] = useState("");
  const digitCount = value.replace(/\D/g, "").length;

  const mutation = useMutation<ShippingSimulation, Error, { postalCode: string }>({
    mutationFn: (input) =>
      invoke.site.actions.shipping.simulate(input) as Promise<ShippingSimulation>,
  });

  const onChange = (raw: string) => {
    const digits = raw.replace(/\D+/g, "").slice(0, maxDigits);
    setValue(format(digits));
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (digitCount < minDigits) return;
    mutation.mutate({ postalCode: value });
  };

  return (
    <div className="flex flex-col gap-3 border-t border-gray-200 pt-5">
      <span className="text-xs text-muted">{resolvedCopy.helper}</span>

      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          type="text"
          inputMode="numeric"
          autoComplete="postal-code"
          aria-label={ariaLabel}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={maxLength}
          className="frost h-10 w-36 rounded-sm px-3 text-sm text-ink placeholder:text-muted-soft focus:outline-none"
          disabled={mutation.isPending}
        />
        <Button
          type="submit"
          variant="outline"
          size="md"
          disabled={mutation.isPending || digitCount < minDigits}
        >
          {mutation.isPending ? (
            <span className="loading loading-spinner loading-xs" />
          ) : (
            resolvedCopy.submit
          )}
        </Button>
      </form>

      {mutation.isError && <p className="text-xs text-error">{mutation.error.message}</p>}

      {mutation.isSuccess && (
        <ul className="frost flex flex-col rounded-sm p-4">
          {mutation.data.methods.map((method) => (
            <MethodRow key={method.id} method={method} copy={resolvedCopy} locale={locale} />
          ))}
          <span className="mt-3 text-xs text-muted">{resolvedCopy.footer}</span>
        </ul>
      )}
    </div>
  );
}
