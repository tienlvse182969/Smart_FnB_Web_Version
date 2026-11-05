import { modeOf } from "../flags";
import { request } from "../http/client";

export type BranchExtra = {
  id: string;
  name: string;
  price: string;
  chainAvailable: boolean;
  branchAvailable: boolean;
  isAvailable: boolean;
};

export type BranchCombo = {
  comboId: string;
  isEnabled: boolean;
  isAvailable: boolean;
  effectiveAvailable: boolean;
  combo: { name: string; price: string; chainPrice: string; isActive: boolean };
};

export async function listBranchExtras(): Promise<BranchExtra[]> {
  if (modeOf("branch_options") === "mock") return [];
  return request<BranchExtra[]>("/menu-extras/branch");
}

export async function setBranchExtraAvailability(id: string, isAvailable: boolean): Promise<void> {
  if (modeOf("branch_options") === "mock") throw new Error("Cần kết nối BE để cập nhật topping");
  await request(`/menu-extras/${encodeURIComponent(id)}/availability`, { method: "PATCH", body: { isAvailable } });
}

export async function listBranchCombos(): Promise<BranchCombo[]> {
  if (modeOf("branch_options") === "mock") return [];
  return request<BranchCombo[]>("/branch-combos");
}

export async function setBranchComboAvailability(id: string, isAvailable: boolean): Promise<void> {
  if (modeOf("branch_options") === "mock") throw new Error("Cần kết nối BE để cập nhật combo");
  await request(`/branch-combos/${encodeURIComponent(id)}/availability`, { method: "PATCH", body: { isAvailable } });
}
