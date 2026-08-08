import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getMerchantServerFn,
  merchantSignInServerFn,
  merchantSignOutServerFn,
} from "./merchant.actions";
import type { MerchantState } from "./merchant.types";

export const MERCHANT_QUERY_KEY = ["rocket-merchant"] as const;

export function useMerchant() {
  const query = useQuery({
    queryKey: MERCHANT_QUERY_KEY,
    queryFn: () => getMerchantServerFn(),
    staleTime: 60_000,
    placeholderData: null,
  });
  return {
    merchant: query.data ?? null,
    isAuthenticated: Boolean(query.data?.email),
    isLoading: query.isLoading,
  };
}

export function useMerchantSignIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; password: string }) =>
      merchantSignInServerFn({ data: input }),
    onSuccess: (merchant: MerchantState) => {
      queryClient.setQueryData(MERCHANT_QUERY_KEY, merchant);
    },
  });
}

export function useMerchantSignOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => merchantSignOutServerFn(),
    onSuccess: () => queryClient.setQueryData(MERCHANT_QUERY_KEY, null),
  });
}
