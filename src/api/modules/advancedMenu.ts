import { request } from "../http/client"

export type ComboChoice = {
  id?: string
  menuItemId: string
  surcharge: number
  isDefault: boolean
}

export type ComboComponent = {
  id?: string
  type: "FIXED" | "CHOICE"
  name: string
  quantity: number
  fixedSizeCode?: string | null
  displayOrder?: number
  choices: ComboChoice[]
}

export type ChainCombo = {
  id: string
  categoryId: string
  name: string
  description: string | null
  imageUrl: string | null
  price: string | number
  isActive: boolean
  components: ComboComponent[]
  branches: Array<{ branchId: string; isEnabled: boolean }>
}

export type SaveComboInput = {
  categoryId: string
  name: string
  description?: string | null
  imageUrl?: string | null
  price: number
  isActive?: boolean
  components: ComboComponent[]
}

export type MenuExtra = {
  id: string
  name: string
  price: string | number
  isActive: boolean
}

export type ItemExtraSettings = {
  id: string
  maxExtras: number
  extras: Array<{
    extraId: string
    price: string | number
    maxQuantity: number
    displayOrder: number
    extra: MenuExtra
  }>
}

export type BranchPriceCell = {
  type: "ITEM" | "COMBO"
  productId: string
  branchId: string
  name: string
  chainPrice: string | number
  priceOverride: string | number | null
  effectivePrice: string | number
}

export type BranchPriceMatrix = {
  branches: Array<{ id: string; name: string }>
  cells: BranchPriceCell[]
}

export type MenuImportDraftItem = {
  name: string
  description: string
  price: number
  action: "CREATE" | "UPDATE_PRICE" | "SKIP"
  existingItemId: string
  branchIds: string[]
  sizes: Array<{ name: string; priceDelta: number }>
  extras: Array<{ name: string; price: number }>
  warning: string
}

export type MenuImportDraft = {
  categories: Array<{ name: string; items: MenuImportDraftItem[] }>
  unresolved: string[]
}

export type MenuImport = {
  id: string
  status: "PROCESSING" | "WAITING_REVIEW" | "IMPORTED" | "FAILED" | "CANCELLED"
  imageUrls: string[]
  ocrText: string[] | null
  draft: MenuImportDraft | null
  result: { created: number; updated: number; skipped: number } | null
  errorReason: string | null
  expiresAt: string
}

const chainBase = (chainId: string) =>
  `/restaurant-chains/${encodeURIComponent(chainId)}`

export const advancedMenuApi = {
  listCombos(chainId: string) {
    return request<ChainCombo[]>(`${chainBase(chainId)}/combos`)
  },
  createCombo(chainId: string, input: SaveComboInput) {
    return request<ChainCombo>(`${chainBase(chainId)}/combos`, {
      method: "POST",
      body: input,
    })
  },
  updateCombo(chainId: string, id: string, input: SaveComboInput) {
    return request<ChainCombo>(
      `${chainBase(chainId)}/combos/${encodeURIComponent(id)}`,
      { method: "PATCH", body: input },
    )
  },
  deleteCombo(chainId: string, id: string) {
    return request(`${chainBase(chainId)}/combos/${encodeURIComponent(id)}`, {
      method: "DELETE",
    })
  },
  assignComboBranches(chainId: string, id: string, branchIds: string[]) {
    return request(
      `${chainBase(chainId)}/combos/${encodeURIComponent(id)}/branches`,
      { method: "PUT", body: { branchIds } },
    )
  },
  listExtras(chainId: string) {
    return request<MenuExtra[]>(`${chainBase(chainId)}/menu/extras`)
  },
  saveExtra(
    chainId: string,
    input: { name: string; price: number; isActive?: boolean },
    id?: string,
  ) {
    return request<MenuExtra>(
      `${chainBase(chainId)}/menu/extras${
        id ? `/${encodeURIComponent(id)}` : ""
      }`,
      {
        method: id ? "PUT" : "POST",
        body: input,
      },
    )
  },
  disableExtra(chainId: string, id: string) {
    return request(
      `${chainBase(chainId)}/menu/extras/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    )
  },
  getItemExtras(chainId: string, itemId: string) {
    return request<ItemExtraSettings>(
      `${chainBase(chainId)}/menu/items/${encodeURIComponent(itemId)}/extras`,
    )
  },
  setItemExtras(
    chainId: string,
    itemId: string,
    input: {
      maxExtras: number
      extras: Array<{
        extraId: string
        price?: number
        maxQuantity: number
        displayOrder?: number
      }>
    },
  ) {
    return request(
      `${chainBase(chainId)}/menu/items/${encodeURIComponent(itemId)}/extras`,
      { method: "PUT", body: input },
    )
  },
  getBranchPrices(chainId: string) {
    return request<BranchPriceMatrix>(`${chainBase(chainId)}/branch-prices`)
  },
  saveBranchPrices(
    chainId: string,
    updates: Array<{
      type: "ITEM" | "COMBO"
      productId: string
      branchId: string
      priceOverride: number | null
    }>,
  ) {
    return request<{ cells: BranchPriceCell[] }>(
      `${chainBase(chainId)}/branch-prices`,
      { method: "PUT", body: { updates } },
    )
  },
  createMenuImport(chainId: string, files: File[]) {
    const form = new FormData()
    files.forEach((file) => form.append("files", file))
    return request<MenuImport>(`${chainBase(chainId)}/menu-imports`, {
      method: "POST",
      body: form,
    })
  },
  getMenuImport(chainId: string, id: string) {
    return request<MenuImport>(
      `${chainBase(chainId)}/menu-imports/${encodeURIComponent(id)}`,
    )
  },
  updateMenuImportDraft(chainId: string, id: string, draft: MenuImportDraft) {
    return request<MenuImport>(
      `${chainBase(chainId)}/menu-imports/${encodeURIComponent(id)}/draft`,
      { method: "PUT", body: draft },
    )
  },
  commitMenuImport(chainId: string, id: string) {
    return request<MenuImport>(
      `${chainBase(chainId)}/menu-imports/${encodeURIComponent(id)}/commit`,
      { method: "POST" },
    )
  },
  cancelMenuImport(chainId: string, id: string) {
    return request(
      `${chainBase(chainId)}/menu-imports/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    )
  },
}
