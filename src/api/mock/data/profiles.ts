/**
 * Hai doanh nghiệp mock theo v9: khác gói (A = Nâng cao, B = Cơ bản) và khác nhận diện.
 * Màu chọn từ bộ dựng sẵn của theme — không viết mã màu ở đây.
 *
 * B là gói Cơ bản nên nhận diện đã lưu của B KHÔNG được áp (BR-41, đặc tả 5.7: "hạ gói → tạm không
 * áp, giữ cấu hình"). Muốn thấy màu của B thì ghi đè gói lên Tiêu chuẩn bằng panel dev.
 */
import { BRAND_COLOR_PRESETS } from "../../../theme";
import type { ApiBranch, Branding, MenuCategory, OptionGroup, OptionItem, PlanTier } from "../../../types";
import type { StoredMenuItem } from "../store";
import type { MockProfileId } from "../scenario";
import { hashString, mulberry32 } from "../prng";

export interface MockBranchSeed {
  id: string;
  code: string;
  name: string;
  addressLine1: string;
  ward: string;
  city: string;
  phone: string;
  /** Hệ số lưu lượng đơn so với mức chung. */
  traffic: number;
}

export interface MockAccountSeed {
  email: string;
  name: string;
  role: "owner" | "manager";
  /** Chỉ số chi nhánh trong `branches` (manager). */
  branchIndex?: number;
}

export interface MockProfile {
  id: MockProfileId;
  chainId: string;
  code: string;
  name: string;
  defaultTier: PlanTier;
  brandPrimary: string;
  brandAccent: string;
  branches: MockBranchSeed[];
  accounts: MockAccountSeed[];
}

export const MOCK_PROFILES: Record<MockProfileId, MockProfile> = {
  A: {
    id: "A",
    chainId: "mock-chain-a",
    code: "CAPHEMOC",
    name: "Cà Phê Mộc Nhà",
    defaultTier: "ADVANCED",
    brandPrimary: BRAND_COLOR_PRESETS[2], // cam — chữ trên nút tự chuyển sang đen (BR-43)
    brandAccent: BRAND_COLOR_PRESETS[3],
    branches: [
      { id: "mock-branch-a1", code: "NGUYENHUE", name: "Chi nhánh Nguyễn Huệ", addressLine1: "24 Nguyễn Huệ", ward: "Phường Bến Nghé", city: "TP. Hồ Chí Minh", phone: "028 3825 1234", traffic: 1.3 },
      { id: "mock-branch-a2", code: "PHUNHUAN", name: "Chi nhánh Phú Nhuận", addressLine1: "45 Phan Xích Long", ward: "Phường 2", city: "TP. Hồ Chí Minh", phone: "028 3844 5678", traffic: 1 },
      { id: "mock-branch-a3", code: "THUDUC", name: "Chi nhánh Thủ Đức", addressLine1: "01 Võ Văn Ngân", ward: "Phường Bình Thọ", city: "TP. Hồ Chí Minh", phone: "028 3896 7890", traffic: 0.7 },
    ],
    accounts: [
      { email: "owner.a@mock.local", name: "Nguyễn Chủ Chuỗi", role: "owner" },
      { email: "manager.a@mock.local", name: "Trần Minh Quân", role: "manager", branchIndex: 0 },
    ],
  },
  B: {
    id: "B",
    chainId: "mock-chain-b",
    code: "BOBALAB",
    name: "Trà Sữa BoBa Lab",
    defaultTier: "BASIC",
    brandPrimary: BRAND_COLOR_PRESETS[7], // tím
    brandAccent: BRAND_COLOR_PRESETS[5],
    branches: [
      { id: "mock-branch-b1", code: "HAIBATRUNG", name: "Chi nhánh Hai Bà Trưng", addressLine1: "15 Bà Triệu", ward: "Phường Hàng Bài", city: "Hà Nội", phone: "024 3943 2345", traffic: 1 },
      { id: "mock-branch-b2", code: "CAUGIAY", name: "Chi nhánh Cầu Giấy", addressLine1: "99 Trần Thái Tông", ward: "Phường Dịch Vọng", city: "Hà Nội", phone: "024 3755 8899", traffic: 0.8 },
    ],
    accounts: [
      { email: "owner.b@mock.local", name: "Lê Thị Chủ", role: "owner" },
      { email: "manager.b@mock.local", name: "Phạm Quản Lý", role: "manager", branchIndex: 0 },
    ],
  },
};

export function profileOf(id: MockProfileId): MockProfile {
  return MOCK_PROFILES[id];
}

export function toApiBranch(profile: MockProfile, seed: MockBranchSeed, index: number): ApiBranch {
  const created = new Date(Date.UTC(2026, 2, 1 + index * 9));
  return {
    id: seed.id,
    chainId: profile.chainId,
    code: seed.code,
    name: seed.name,
    phone: seed.phone,
    email: null,
    addressLine1: seed.addressLine1,
    addressLine2: null,
    ward: seed.ward,
    district: null,
    city: seed.city,
    country: "VN",
    timezone: "Asia/Ho_Chi_Minh",
    status: "ACTIVE",
    createdAt: created.toISOString(),
    updatedAt: created.toISOString(),
    chain: { id: profile.chainId, code: profile.code, name: profile.name, status: "ACTIVE" },
  };
}

export function buildBranding(profile: MockProfile, chainId: string): Branding {
  return {
    tenantId: chainId,
    displayName: profile.name,
    logoUrl: undefined,
    primaryColor: profile.brandPrimary,
    accentColor: profile.brandAccent,
    isCustom: true,
  };
}

// ---------------------------------------------------------------------------
// Menu và nhóm tuỳ chọn (đặc tả 12.2)
// ---------------------------------------------------------------------------

export function buildOptionGroups(profile: MockProfile, _chainId: string): OptionGroup[] {
  const p = profile.id.toLowerCase();
  const opt = (key: string, name: string, order: number, priceDelta = 0, isDefault = false): OptionItem => ({
    id: `${p}-op-${key}`, name, code: key.toUpperCase(), priceDelta, displayOrder: order, isActive: true, isDefault,
  });
  const group = (key: string, name: string, order: number, rule: Pick<OptionGroup, "isRequired" | "minSelections" | "maxSelections">, options: OptionItem[]): OptionGroup => ({
    id: `${p}-og-${key}`, name, code: key.toUpperCase(), ...rule, displayOrder: order, isActive: true, options,
  });
  const one = { isRequired: true, minSelections: 1, maxSelections: 1 };
  return [
    group("size", "Size", 1, one, [opt("size-m", "M", 1, 0, true), opt("size-l", "L", 2, 6000)]),
    group("sugar", "Đường", 2, one, ["0%", "30%", "50%", "70%", "100%"].map((label, i) => opt(`sugar-${label.replace("%", "")}`, label, i + 1, 0, label === "100%"))),
    group("ice", "Đá", 3, one, [opt("ice-none", "Không đá", 1), opt("ice-less", "Ít đá", 2), opt("ice-normal", "Bình thường", 3, 0, true)]),
    group("topping", "Topping", 4, { isRequired: false, minSelections: 0, maxSelections: 3 }, [
      opt("top-pearl", "Trân châu đen", 1, 5000), opt("top-coconut", "Thạch dừa", 2, 5000), opt("top-pudding", "Pudding", 3, 7000),
    ]),
  ];
}

interface ItemSeed {
  name: string;
  category: string;
  price: number;
  /** Nhóm tuỳ chọn gắn vào món: "drink" = size+đường+đá, "topping" = thêm topping. */
  kind: "drink" | "topping" | "none";
  activeChain?: boolean;
}

const MENU_SEEDS: Record<MockProfileId, ItemSeed[]> = {
  A: [
    { name: "Cà phê sữa đá", category: "Cà phê", price: 29000, kind: "drink" },
    { name: "Bạc xỉu", category: "Cà phê", price: 32000, kind: "drink" },
    { name: "Cà phê muối", category: "Cà phê", price: 35000, kind: "drink" },
    { name: "Cold brew cam sả", category: "Cà phê", price: 45000, kind: "drink" },
    { name: "Trà đào cam sả", category: "Trà", price: 45000, kind: "topping" },
    { name: "Trà vải hoa hồng", category: "Trà", price: 42000, kind: "topping" },
    { name: "Matcha latte", category: "Trà", price: 49000, kind: "topping" },
    { name: "Sinh tố bơ", category: "Sinh tố", price: 52000, kind: "drink", activeChain: false },
    { name: "Bánh croissant", category: "Bánh", price: 35000, kind: "none" },
    { name: "Bánh tiramisu", category: "Bánh", price: 45000, kind: "none" },
  ],
  B: [
    { name: "Trà sữa truyền thống", category: "Trà sữa", price: 30000, kind: "topping" },
    { name: "Trà sữa matcha", category: "Trà sữa", price: 38000, kind: "topping" },
    { name: "Hồng trà sữa", category: "Trà sữa", price: 32000, kind: "topping" },
    { name: "Sữa tươi trân châu đường đen", category: "Trà sữa", price: 42000, kind: "drink" },
    { name: "Trà đào", category: "Trà trái cây", price: 35000, kind: "topping" },
    { name: "Trà vải", category: "Trà trái cây", price: 35000, kind: "topping" },
    { name: "Trà chanh giã tay", category: "Trà trái cây", price: 28000, kind: "drink" },
    { name: "Kem cheese thêm", category: "Món thêm", price: 12000, kind: "none", activeChain: false },
  ],
};

const catSlug = (name: string) => name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]+/g, "-");

/** Danh mục suy từ các món mẫu, theo thứ tự xuất hiện. */
export function buildCategories(profile: MockProfile): MenuCategory[] {
  const p = profile.id.toLowerCase();
  const names = [...new Set(MENU_SEEDS[profile.id].map((s) => s.category))];
  return names.map((name, i) => ({ id: `${p}-cat-${catSlug(name)}`, name, description: null, displayOrder: i, isActive: true, itemCount: 0 }));
}

export function buildMenu(profile: MockProfile): StoredMenuItem[] {
  const p = profile.id.toLowerCase();
  const groups = (kind: ItemSeed["kind"]): string[] =>
    kind === "drink"
      ? [`${p}-og-size`, `${p}-og-sugar`, `${p}-og-ice`]
      : kind === "topping"
        ? [`${p}-og-size`, `${p}-og-sugar`, `${p}-og-ice`, `${p}-og-topping`]
        : [];
  return MENU_SEEDS[profile.id].map((seed, i) => ({
    id: `${p}-m${String(i + 1).padStart(2, "0")}`,
    categoryId: `${p}-cat-${catSlug(seed.category)}`,
    categoryName: seed.category,
    sku: `${profile.code}-${String(i + 1).padStart(3, "0")}`,
    name: seed.name,
    description: null,
    price: seed.price,
    imageUrl: null,
    preparationMinutes: null,
    isActive: seed.activeChain ?? true,
    seedOptionGroupIds: groups(seed.kind),
    seeded: true,
  }));
}
