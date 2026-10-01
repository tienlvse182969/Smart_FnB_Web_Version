/** v7 — sơ đồ bàn thật của chi nhánh (đặc tả v9 đã bỏ bàn). Gỡ ở bước xoá v7. */
import {
  listTables,
  createTable as apiCreateTable,
  updateTableStatus as apiUpdateTableStatus,
  replaceTableAdjacency,
  type ApiTable,
  type ApiTableStatus,
  type CreateTableInput,
} from "../../services/tablesApi";
import type { LoadStatus, SliceCreator } from "../types";

export interface LegacyTablesSlice {
  /** Sơ đồ bàn thật của chi nhánh đang chọn. */
  apiTables: ApiTable[];
  tablesStatus: LoadStatus;
  tablesError: string | null;

  /** Nạp sơ đồ bàn thật của chi nhánh đang chọn. */
  loadTables: () => Promise<void>;
  createBranchTable: (input: CreateTableInput) => Promise<void>;
  setTableStatus: (tableId: string, status: ApiTableStatus) => Promise<void>;
  setTableAdjacency: (tableId: string, adjacentTableIds: string[]) => Promise<void>;
}

export const createLegacyTablesSlice: SliceCreator<LegacyTablesSlice> = (set, get) => ({
  apiTables: [],
  tablesStatus: "idle",
  tablesError: null,

  loadTables: async () => {
    const branchId = get().currentBranchId;
    if (!branchId) {
      set({ apiTables: [], tablesStatus: "ready", tablesError: null });
      return;
    }
    set({ tablesStatus: "loading", tablesError: null });
    try {
      set({ apiTables: await listTables(branchId), tablesStatus: "ready" });
    } catch (err) {
      set({
        apiTables: [],
        tablesStatus: "error",
        tablesError: err instanceof Error ? err.message : "Không tải được sơ đồ bàn",
      });
    }
  },

  createBranchTable: async (input) => {
    const branchId = get().currentBranchId;
    if (!branchId) throw new Error("Chưa chọn chi nhánh");
    await apiCreateTable(branchId, input);
    await get().loadTables();
  },

  setTableStatus: async (tableId, status) => {
    await apiUpdateTableStatus(tableId, status);
    await get().loadTables();
  },

  setTableAdjacency: async (tableId, adjacentTableIds) => {
    const branchId = get().currentBranchId;
    if (!branchId) throw new Error("Chưa chọn chi nhánh");
    await replaceTableAdjacency(branchId, tableId, adjacentTableIds);
    await get().loadTables();
  },
});
