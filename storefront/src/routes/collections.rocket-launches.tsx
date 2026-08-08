import { createFileRoute } from "@tanstack/react-router";
import RocketCollection from "../components/rocket/RocketCollection";

export const Route = createFileRoute("/collections/rocket-launches")({
  head: () => ({
    meta: [
      { title: "Rocket Drops | Demo Storefront" },
      {
        name: "description",
        content: "Produtos descobertos e publicados pela inteligência Rocket.",
      },
    ],
  }),
  component: RocketCollection,
});
