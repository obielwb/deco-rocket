import { useMutation } from "@tanstack/react-query";
import Icon from "../../components/ui/Icon";
import Section from "../../components/ui/Section";
import Button from "../../components/ui/Button";
import { invoke } from "../../runtime";
import type { SubscribeNewsletterResult } from "../../actions/newsletter/subscribe";
import { clx } from "~/sdk/clx";

export interface NoticeProps {
  /**
   * @title Title
   * @description Bold heading shown for this notice state
   */
  title?: string;
  /**
   * @title Description
   * @description Subtext explaining the notice state
   */
  description?: string;
}

export interface NoticeConfig {
  /**
   * @title Empty state
   * @description Initial pre-signup notice (call-to-action)
   */
  empty?: NoticeProps;
  /**
   * @title Success state
   * @description Notice shown after a successful subscription
   */
  success?: NoticeProps;
  /**
   * @title Failed state
   * @description Notice shown when the subscription request fails
   */
  failed?: NoticeProps;
}

export interface FormConfig {
  /**
   * @title Submit button label
   * @description Text on the signup CTA
   * @default "Sign up"
   */
  label?: string;
  /**
   * @title Email placeholder
   * @description Placeholder shown inside the email input
   * @default "Enter your email address"
   */
  placeholder?: string;
}

export interface Props {
  /**
   * @title Notices
   * @description Empty / success / failed notice copies
   */
  notices?: NoticeConfig;
  /**
   * @title Form
   * @description Submit label and placeholder copy
   */
  form?: FormConfig;
}

const DEFAULT_NOTICES = {
  empty: {
    title: "Get top deals, latest trends, and more.",
    description:
      "Receive our news and promotions in advance. Enjoy and get 10% off your first purchase. For more information click here.",
  },
  success: {
    title: "Thank you for subscribing!",
    description:
      "You're now signed up to receive the latest news, trends, and exclusive promotions directly to your inbox. Stay tuned!",
  },
  failed: {
    title: "Oops. Something went wrong!",
    description:
      "Something went wrong. Please try again. If the problem persists, please contact us.",
  },
} satisfies Required<NoticeConfig>;

async function subscribeNewsletter(email: string): Promise<void> {
  const result = (await invoke.site.actions.newsletter.subscribe({
    email,
  })) as SubscribeNewsletterResult | undefined;
  if (!result?.success) {
    throw new Error("Newsletter subscription failed");
  }
}

function Notice({ title, description }: NoticeProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 sm:items-start">
      <h2 className="text-display text-center font-medium text-ink sm:text-start">{title}</h2>
      <span className="text-center text-sm font-normal text-muted sm:text-start">
        {description}
      </span>
    </div>
  );
}

export default function Newsletter({ notices, form }: Props) {
  const empty = { ...DEFAULT_NOTICES.empty, ...notices?.empty };
  const success = { ...DEFAULT_NOTICES.success, ...notices?.success };
  const failed = { ...DEFAULT_NOTICES.failed, ...notices?.failed };
  const label = form?.label ?? "Sign up";
  const placeholder = form?.placeholder ?? "Enter your email address";

  const subscribe = useMutation({ mutationFn: subscribeNewsletter });

  if (subscribe.isSuccess || subscribe.isError) {
    const isSuccess = subscribe.isSuccess;
    return (
      <Section.Container>
        <div className="glass-strong flex flex-col items-center justify-center gap-5 rounded-md p-10 sm:flex-row sm:gap-10 sm:p-14">
          <Icon
            size={64}
            className={clx(isSuccess ? "text-ink" : "text-error")}
            id={isSuccess ? "check-circle" : "error"}
          />
          <div className="flex flex-col items-center gap-4 sm:items-start">
            <Notice {...(isSuccess ? success : failed)} />
            {subscribe.isError && (
              <Button variant="outline" onClick={() => subscribe.reset()}>
                Try again
              </Button>
            )}
          </div>
        </div>
      </Section.Container>
    );
  }

  return (
    <Section.Container>
      <div className="glass-strong grid place-items-center gap-8 rounded-md p-10 sm:grid-cols-2 sm:gap-20 sm:p-14">
        <Notice {...empty} />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            const email = `${data.get("email") ?? ""}`.trim();
            if (email) subscribe.mutate(email);
          }}
          className="flex w-full flex-col gap-3 sm:flex-row"
        >
          <input
            name="email"
            type="email"
            required
            className="frost h-10 grow rounded-sm px-4 text-sm text-ink placeholder:text-muted-soft focus:outline-none"
            placeholder={placeholder}
            disabled={subscribe.isPending}
          />

          <Button type="submit" variant="solid" size="md" disabled={subscribe.isPending}>
            {subscribe.isPending ? <span className="loading loading-spinner loading-xs" /> : label}
          </Button>
        </form>
      </div>
    </Section.Container>
  );
}

export const LoadingFallback = () => <Section.Placeholder height="412px" />;
