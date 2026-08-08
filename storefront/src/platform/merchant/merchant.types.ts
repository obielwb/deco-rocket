export interface Merchant {
  email: string;
  name: string;
  storeName: string;
  role: "owner";
}

export type MerchantState = Merchant | null;
