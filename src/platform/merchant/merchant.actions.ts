import { createServerFn } from "@tanstack/react-start";
import {
  deleteCookie,
  getRequest,
  getRequestProtocol,
  setCookie,
} from "@tanstack/react-start/server";
import type { Merchant } from "./merchant.types";

const MERCHANT_COOKIE = "rocket_merchant_session";
const DEMO_EMAIL = "lojista@rocket.local";
const DEMO_PASSWORD = "rocket2026";
const DEMO_TOKEN = "rocket-demo-merchant-v1";

const demoMerchant: Merchant = {
  email: DEMO_EMAIL,
  name: "Gabriel",
  storeName: "Demo Storefront",
  role: "owner",
};

function hasDemoSession(cookieHeader: string | null): boolean {
  return (cookieHeader ?? "")
    .split(";")
    .map((part) => part.trim())
    .some((part) => part === `${MERCHANT_COOKIE}=${DEMO_TOKEN}`);
}

export const getMerchantServerFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<Merchant | null> => {
    return hasDemoSession(getRequest().headers.get("cookie")) ? demoMerchant : null;
  },
);

export const merchantSignInServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string; password: string }) => input)
  .handler(async ({ data }): Promise<Merchant> => {
    if (data.email.trim().toLowerCase() !== DEMO_EMAIL || data.password !== DEMO_PASSWORD) {
      throw new Error("E-mail ou senha de lojista inválidos.");
    }

    setCookie(MERCHANT_COOKIE, DEMO_TOKEN, {
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
      httpOnly: true,
      sameSite: "lax",
      secure: getRequestProtocol() === "https",
    });
    return demoMerchant;
  });

export const merchantSignOutServerFn = createServerFn({ method: "POST" }).handler(
  async (): Promise<null> => {
    deleteCookie(MERCHANT_COOKIE, { path: "/" });
    return null;
  },
);
