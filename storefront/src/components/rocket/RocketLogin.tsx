import { Link } from "@tanstack/react-router";
import { useMerchantSignIn } from "../../platform/merchant";

export default function RocketLogin() {
  const signIn = useMerchantSignIn();

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    signIn.mutate({
      email: String(data.get("email") ?? ""),
      password: String(data.get("password") ?? ""),
    });
  };

  return (
    <main className="rocket-login min-h-screen px-4 py-8 text-ink">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl overflow-hidden rounded-lg border border-black/8 bg-white shadow-[0_28px_80px_rgba(0,0,0,.10)]">
        <section className="relative hidden w-[56%] overflow-hidden bg-ink p-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="rocket-orbit" aria-hidden="true" />
          <Link to="/" className="relative z-10 text-sm font-semibold tracking-tight">
            deco storefront
          </Link>
          <div className="relative z-10 max-w-lg">
            <span className="mb-5 inline-flex rounded-full border border-white/20 px-3 py-1 text-xs">
              Inteligência para catálogo
            </span>
            <h1 className="text-5xl font-semibold leading-[.98] tracking-[-.055em]">
              Transforme sinais em lançamentos.
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-white/60">
              A Rocket pesquisa tendências, cruza com o seu catálogo e entrega conceitos prontos
              para validar, produzir e comunicar.
            </p>
          </div>
          <div className="relative z-10 flex items-center gap-2 text-xs text-white/45">
            <span className="size-2 rounded-full bg-[#b7f34a] shadow-[0_0_18px_#b7f34a]" />
            Pesquisa automática ativa
          </div>
        </section>

        <section className="flex flex-1 items-center justify-center p-6 sm:p-12">
          <div className="w-full max-w-sm">
            <div className="mb-10 lg:hidden">
              <Link to="/" className="text-sm font-semibold">
                deco storefront
              </Link>
            </div>
            <p className="text-xs font-medium uppercase tracking-[.18em] text-muted">Rocket</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-.04em]">Acesso do lojista</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Entre no ambiente interno para acompanhar oportunidades e criar pesquisas.
            </p>

            <form onSubmit={submit} className="mt-8 space-y-4">
              <label className="block text-sm font-medium">
                E-mail
                <input
                  name="email"
                  type="email"
                  defaultValue="lojista@rocket.local"
                  className="mt-2 h-12 w-full rounded-sm border border-black/15 bg-white px-4 text-sm outline-none transition focus:border-black"
                  autoComplete="username"
                  required
                />
              </label>
              <label className="block text-sm font-medium">
                Senha
                <input
                  name="password"
                  type="password"
                  defaultValue="rocket2026"
                  className="mt-2 h-12 w-full rounded-sm border border-black/15 bg-white px-4 text-sm outline-none transition focus:border-black"
                  autoComplete="current-password"
                  required
                />
              </label>

              {signIn.isError && (
                <p className="rounded-sm bg-red-50 px-3 py-2 text-sm text-red-700">
                  {signIn.error instanceof Error
                    ? signIn.error.message
                    : "Não foi possível entrar."}
                </p>
              )}

              <button
                type="submit"
                disabled={signIn.isPending}
                className="tap-scale flex h-12 w-full items-center justify-center rounded-sm bg-ink px-4 text-sm font-medium text-white disabled:opacity-60"
              >
                {signIn.isPending ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : (
                  "Entrar na Rocket"
                )}
              </button>
            </form>

            <div className="mt-6 rounded-sm bg-gray-50 p-4 text-xs leading-relaxed text-muted">
              <strong className="text-ink">Usuário de demonstração preenchido.</strong> Este acesso
              é separado da conta de cliente Shopify e existe apenas no ambiente local.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
