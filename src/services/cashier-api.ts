import { apiRequest } from "./api";

export type CashierOption = {
  id: string;
  name: string;
  priceDelta: string;
  branchAvailability: { isAvailable: boolean }[];
};

export type CashierOptionGroup = {
  id: string;
  name: string;
  isRequired: boolean;
  minSelections: number;
  maxSelections: number;
  options: CashierOption[];
};

export type CashierMenuEntry = {
  isAvailable: boolean;
  remainingPortions: number | null;
  menuItem: {
    id: string;
    name: string;
    price: string;
    imageUrl?: string;
    category: { id: string; name: string };
    optionGroups: { group: CashierOptionGroup }[];
  };
};

export type CounterOrder = {
  id: string;
  orderCode: string;
  status: string;
  paymentStatus: string;
  subtotal: string;
  totalAmount: string;
  callNumber?: number;
  items: {
    id: string;
    itemName: string;
    unitPrice: string;
    quantity: number;
    totalPrice: string;
    selectedOptions?: { name: string; groupName: string; priceDelta: string }[];
    specialInstructions?: string;
  }[];
};

export type CheckoutItem = {
  menuItemId: string;
  quantity: number;
  optionIds: string[];
  specialInstructions?: string;
};

export type CounterReceipt = {
  orderId: string; orderCode: string; callNumber: number; paidAt: string; currency: string;
  seller: { name: string; logoUrl?: string; branchName: string; address: string; phone?: string };
  cashier?: string; items: CounterOrder["items"]; subtotal: string; totalAmount: string;
};

export const getCashierContext = () =>
  apiRequest<{ branch: { id: string; name: string }; menuItems: CashierMenuEntry[] }>("/cashier/context");

export const createCounterOrder = () =>
  apiRequest<CounterOrder>("/cashier/orders", { method: "POST", body: JSON.stringify({}) });

export const checkoutCounterOrder = (items: CheckoutItem[], note?: string) =>
  apiRequest<CounterOrder>("/cashier/checkout", {
    method: "POST",
    body: JSON.stringify({ items, note }),
  });

export const getCounterOrder = (id: string) =>
  apiRequest<CounterOrder>(`/cashier/orders/${id}`);

export const listTodayCounterOrders = () => apiRequest<CounterOrder[]>("/cashier/orders");

export const getCounterReceipt = (id: string) =>
  apiRequest<CounterReceipt>(`/cashier/orders/${id}/receipt`);

export const reprintCounterReceipt = (id: string, reason: string) =>
  apiRequest<CounterReceipt>(`/cashier/orders/${id}/reprint`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });

export const addCounterOrderItem = (orderId: string, menuItemId: string, optionIds: string[]) =>
  apiRequest(`/cashier/orders/${orderId}/items`, {
    method: "POST",
    body: JSON.stringify({ menuItemId, quantity: 1, optionIds }),
  });

export const removeCounterOrderItem = (orderId: string, itemId: string) =>
  apiRequest(`/cashier/orders/${orderId}/items/${itemId}`, { method: "DELETE" });

export const finalizeCounterOrder = (orderId: string) =>
  apiRequest<CounterOrder>(`/cashier/orders/${orderId}/finalize`, { method: "POST" });

export const collectCounterCash = (orderId: string, tenderedAmount: number) =>
  apiRequest<{ order: CounterOrder; payment: { changeAmount: string } }>(`/cashier/orders/${orderId}/payments/cash`, {
    method: "POST",
    body: JSON.stringify({ tenderedAmount }),
  });
