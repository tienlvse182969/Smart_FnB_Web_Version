/** Tuỳ chọn món (đặc tả v9 mục 12) — nhóm tuỳ chọn dùng chung cho nhiều món. */

export type OptionItem = {
  id: string;
  name: string;
  /** Giá cộng thêm (đồng, số nguyên ≥ 0 — BR-19). */
  priceDelta: number;
  /** Cờ kinh doanh cấp chuỗi (Owner). Cờ còn bán theo chi nhánh nằm ở BranchOptionState. */
  activeChain: boolean;
};

export type OptionGroup = {
  id: string;
  /** = chainId. */
  tenantId: string;
  name: string;
  required: boolean;
  /** Số chọn tối thiểu / tối đa (BR-14). */
  minSelect: number;
  maxSelect: number;
  defaultOptionIds: string[];
  sortOrder: number;
  options: OptionItem[];
};

/** Cờ còn bán của một tuỳ chọn tại một chi nhánh (Manager/Barista bật tắt — BR-12, BR-36). */
export type BranchOptionState = {
  branchId: string;
  optionId: string;
  isAvailable: boolean;
};
