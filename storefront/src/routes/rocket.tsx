import { createFileRoute } from "@tanstack/react-router";
import RocketApp from "../components/rocket/RocketApp";
import RocketLogin from "../components/rocket/RocketLogin";
import { useMerchant } from "../platform/merchant";

export const Route = createFileRoute("/rocket")({
  head: () => ({
    meta: [
      { title: "Rocket — Inteligência de produto" },
      {
        name: "description",
        content: "Pesquisa de tendências, catálogo, criativos e fornecedores para lojistas.",
      },
    ],
  }),
  component: RocketRoute,
});

function RocketRoute() {
  const { isAuthenticated, isLoading } = useMerchant();

  if (isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f4f4f1]">
        <span className="loading loading-spinner loading-lg" />
      </main>
    );
  }

  return isAuthenticated ? <RocketApp /> : <RocketLogin />;
}
