import { useMutation } from "@tanstack/react-query";
import type { Product } from "@decocms/apps-commerce/types";
import { invoke } from "../../runtime";
import { useUser } from "../../platform/user";
import type { NotifyMeResult } from "../../actions/notifyMe/subscribe";
import Button from "../ui/Button";

export interface Props {
  productID: Product["productID"];
}

const INPUT_CLASS =
  "frost h-10 rounded-sm px-3 text-sm text-ink placeholder:text-muted-soft focus:outline-none";

export default function OutOfStock({ productID }: Props) {
  const { user } = useUser();
  const notify = useMutation({
    mutationFn: async (input: { email: string; name?: string }) => {
      const result = (await invoke.site.actions.notifyMe.subscribe({
        skuId: productID,
        email: input.email,
        name: input.name,
      })) as NotifyMeResult | undefined;
      if (!result?.success) throw new Error("Notify request failed");
      return result;
    },
  });

  if (notify.isSuccess) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink-soft">You're on the list!</span>
        <span className="text-xs text-muted">
          We'll email you when this product is back in stock.
        </span>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col items-start gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        const email = `${data.get("email") ?? ""}`.trim();
        const name = `${data.get("name") ?? ""}`.trim();
        if (email) notify.mutate({ email, name });
      }}
    >
      <span className="text-sm font-medium text-ink-soft">
        This product is currently unavailable
      </span>
      <span className="text-xs text-muted">Notify me when it's back in stock</span>

      <input placeholder="Name" className={INPUT_CLASS} name="name" />
      <input
        placeholder="Email"
        type="email"
        required
        className={INPUT_CLASS}
        name="email"
        defaultValue={user?.email ?? ""}
      />

      <Button type="submit" variant="solid" size="md" disabled={notify.isPending}>
        {notify.isPending ? <span className="loading loading-spinner loading-xs" /> : "Submit"}
      </Button>

      {notify.isError && (
        <span className="text-xs text-error">Something went wrong. Please try again.</span>
      )}
    </form>
  );
}
