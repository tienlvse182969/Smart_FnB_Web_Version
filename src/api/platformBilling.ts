import { request } from "./http/client";

export type SubscriptionCheckout = {
  id: string;
  planId: string;
  amount: number;
  status: "PENDING" | "PAID" | "FAILED" | "NEEDS_REVIEW";
  checkoutUrl: string | null;
  paidAt: string | null;
};

export const platformBillingApi = {
  createCheckout(chainId: string, planId: string) {
    return request<SubscriptionCheckout>(
      `/restaurant-chains/${chainId}/subscription/checkouts`,
      {
        method: "POST",
        body: { planId },
      },
    );
  },
  getCheckout(chainId: string, checkoutId: string) {
    return request<SubscriptionCheckout>(
      `/restaurant-chains/${chainId}/subscription/checkouts/${checkoutId}`,
    );
  },
};
