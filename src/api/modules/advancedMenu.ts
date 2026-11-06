import { request } from "../http/client";

export type MenuImportDraftItem = {
  name: string;
  description: string;
  price: number;
  action: "CREATE" | "UPDATE_PRICE" | "SKIP";
  existingItemId: string;
  branchIds: string[];
  sizes: Array<{ name: string; priceDelta: number }>;
  extras: Array<{ name: string; price: number }>;
  warning: string;
};

export type MenuImportDraft = {
  categories: Array<{ name: string; items: MenuImportDraftItem[] }>;
  unresolved: string[];
};

export type MenuImport = {
  id: string;
  status: "PROCESSING" | "WAITING_REVIEW" | "IMPORTED" | "FAILED" | "CANCELLED";
  imageUrls: string[];
  ocrText: string[] | null;
  draft: MenuImportDraft | null;
  result: { created: number; updated: number; skipped: number } | null;
  errorReason: string | null;
  expiresAt: string;
};

const chainBase = (chainId: string) => `/restaurant-chains/${encodeURIComponent(chainId)}`;

/** OW-12 only. Combo, topping and branch pricing use their dedicated API modules. */
export const advancedMenuApi = {
  createMenuImport(chainId: string, files: File[]) {
    const form = new FormData();
    files.forEach((file) => form.append("files", file));
    return request<MenuImport>(`${chainBase(chainId)}/menu-imports`, {
      method: "POST",
      body: form,
    });
  },
  getMenuImport(chainId: string, id: string) {
    return request<MenuImport>(`${chainBase(chainId)}/menu-imports/${encodeURIComponent(id)}`);
  },
  updateMenuImportDraft(chainId: string, id: string, draft: MenuImportDraft) {
    return request<MenuImport>(`${chainBase(chainId)}/menu-imports/${encodeURIComponent(id)}/draft`, {
      method: "PUT",
      body: draft,
    });
  },
  commitMenuImport(chainId: string, id: string) {
    return request<MenuImport>(`${chainBase(chainId)}/menu-imports/${encodeURIComponent(id)}/commit`, {
      method: "POST",
    });
  },
  cancelMenuImport(chainId: string, id: string) {
    return request(`${chainBase(chainId)}/menu-imports/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },
};
