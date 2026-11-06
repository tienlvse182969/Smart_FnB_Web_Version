/** Bản REAL của module extras — BE `menu-extras.controller.ts`. Thân chỉ gồm trường có trong DTO (BE bật `forbidNonWhitelisted`). */
import { ApiError } from "../../http/errors";
import { request } from "../../http/client";
import { mapExtra, mapItemExtras, type RawExtra, type RawItemExtras } from "./mapper";
import { validateExtra, validateItemExtras } from "./rules";
import type { ExtrasApi } from "./index";

const base = (chainId: string) => `/restaurant-chains/${chainId}/menu`;

function assertValid(message: string | null): void {
  if (message) throw new ApiError(400, message, [message]);
}

export const extrasReal: ExtrasApi = {
  async listExtras(chainId) {
    return (await request<RawExtra[]>(`${base(chainId)}/extras`)).map(mapExtra);
  },

  async createExtra(chainId, input) {
    assertValid(validateExtra(input));
    const body: Record<string, unknown> = { name: input.name.trim(), price: input.price };
    if (input.isActive !== undefined) body.isActive = input.isActive;
    return mapExtra(await request<RawExtra>(`${base(chainId)}/extras`, { method: "POST", body }));
  },

  async updateExtra(chainId, id, input) {
    assertValid(validateExtra(input));
    const body = { name: input.name.trim(), price: input.price, isActive: input.isActive };
    return mapExtra(await request<RawExtra>(`${base(chainId)}/extras/${id}`, { method: "PUT", body }));
  },

  async disableExtra(chainId, id) {
    await request<unknown>(`${base(chainId)}/extras/${id}`, { method: "DELETE" });
  },

  async getItemExtras(chainId, itemId) {
    return mapItemExtras(await request<RawItemExtras>(`${base(chainId)}/items/${itemId}/extras`));
  },

  async setItemExtras(chainId, itemId, input) {
    assertValid(validateItemExtras(input));
    // `displayOrder` theo vị trí trong danh sách; `price` luôn gửi tường minh (không phụ thuộc giá thư viện lúc lưu).
    const body = {
      maxExtras: input.maxExtras,
      extras: input.extras.map((x, index) => ({ extraId: x.extraId, price: x.price, maxQuantity: x.maxQuantity, displayOrder: index })),
    };
    await request<unknown>(`${base(chainId)}/items/${itemId}/extras`, { method: "PUT", body });
  },
};
