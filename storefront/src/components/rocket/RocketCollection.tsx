import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { getRocketLaunchesServerFn } from "../../platform/rocket";
import RocketImage from "./RocketImage";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default function RocketCollection() {
  const [collection, setCollection] = useState("Todas");
  const launches = useQuery({
    queryKey: ["rocket-launches"],
    queryFn: () => getRocketLaunchesServerFn(),
    staleTime: 0,
    refetchInterval: 5_000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: "always",
  });
  const products = launches.data?.products ?? [];
  const collections = ["Todas", ...new Set(products.map((product) => product.collection))];
  const visible =
    collection === "Todas"
      ? products
      : products.filter((product) => product.collection === collection);

  return (
    <div className="min-h-screen bg-[#f5f5f1] text-ink">
      <header className="sticky top-0 z-30 border-b border-black/8 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 sm:px-7">
          <Link to="/" className="text-sm font-semibold tracking-[-.03em]">
            deco storefront
          </Link>
          <nav className="hidden items-center gap-1 rounded-full bg-[#efefeb] p-1 sm:flex">
            <Link to="/" className="rounded-full px-4 py-2 text-xs hover:bg-white">
              Loja
            </Link>
            <span className="rounded-full bg-ink px-4 py-2 text-xs font-medium text-white">
              Rocket Drops
            </span>
          </nav>
          <Link
            to="/rocket"
            className="flex items-center gap-2 rounded-full border border-black/12 px-3 py-2 text-xs font-medium"
          >
            <span className="size-1.5 rounded-full bg-[#b7f34a]" /> Área do lojista
          </Link>
        </div>
      </header>

      <main>
        <section className="rocket-collection-hero overflow-hidden border-b border-black/10">
          <div className="mx-auto grid min-h-80 max-w-[1440px] items-end gap-8 px-4 py-10 sm:px-7 lg:grid-cols-[1fr_auto] lg:py-14">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[.16em] text-black/50">
                Laboratório de lançamentos
              </p>
              <h1 className="mt-4 text-5xl font-semibold tracking-[-.065em] sm:text-7xl">
                Rocket Drops
              </h1>
              <p className="mt-5 max-w-xl text-sm leading-relaxed text-black/65 sm:text-base">
                Produtos descobertos pelo radar, desenvolvidos no report e publicados pelo lojista
                para validação na storefront.
              </p>
            </div>
            <div className="rounded-sm border border-black/15 bg-white/55 p-5 backdrop-blur-sm">
              <p className="text-4xl font-semibold tracking-[-.05em]">{products.length}</p>
              <p className="mt-1 text-xs text-black/55">produtos ativos</p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1440px] px-4 py-10 sm:px-7 sm:py-14">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs uppercase tracking-[.14em] text-muted">Coleção</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-.04em]">
                Lançamentos em validação
              </h2>
            </div>
            {collections.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {collections.map((item) => (
                  <button
                    type="button"
                    key={item}
                    onClick={() => setCollection(item)}
                    className={`shrink-0 rounded-full px-4 py-2 text-xs transition ${
                      collection === item
                        ? "bg-ink text-white"
                        : "border border-black/10 bg-white hover:border-black/30"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}
          </div>

          {launches.isLoading ? (
            <div className="grid min-h-64 place-items-center">
              <span className="loading loading-spinner loading-lg" />
            </div>
          ) : launches.isError ? (
            <div className="mt-8 rounded-sm border border-red-200 bg-red-50 p-6 text-sm text-red-700">
              A coleção não pôde ser carregada. Verifique se o research backend está ativo.
            </div>
          ) : visible.length === 0 ? (
            <div className="mt-8 grid min-h-72 place-items-center rounded-md border border-dashed border-black/18 bg-white p-8 text-center">
              <div>
                <p className="text-lg font-semibold">Nenhum produto lançado ainda.</p>
                <p className="mt-2 text-sm text-muted">
                  Abra um report, escolha a coleção e publique o primeiro conceito.
                </p>
                <Link
                  to="/rocket"
                  className="mt-5 inline-flex rounded-sm bg-ink px-5 py-3 text-sm font-medium text-white"
                >
                  Ir para a Rocket
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-5">
              {visible.map((product) => (
                <article key={product.id} className="group min-w-0">
                  <div className="relative aspect-square overflow-hidden rounded-sm bg-white">
                    <RocketImage
                      src={product.imageUrl}
                      alt={product.name}
                      className="size-full object-cover transition duration-500 group-hover:scale-[1.025]"
                    />
                    <span className="absolute left-3 top-3 rounded-full bg-[#d9ff45] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.08em]">
                      Novo
                    </span>
                    <span className="absolute bottom-3 right-3 rounded-full bg-white/85 px-2.5 py-1 text-[10px] backdrop-blur-sm">
                      {product.inventory} em estoque
                    </span>
                  </div>
                  <div className="pt-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="line-clamp-2 text-sm font-medium">{product.name}</h3>
                        <p className="mt-1 text-xs text-muted">{product.collection}</p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold">
                        {money.format(product.price)}
                      </p>
                    </div>
                    <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted">
                      {product.tagline}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-black/8 bg-white px-4 py-8 text-center text-xs text-muted">
        Rocket Drops · catálogo local de validação da Demo Storefront
      </footer>
    </div>
  );
}
