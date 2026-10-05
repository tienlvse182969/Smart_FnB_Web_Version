import { describe, expect, it, vi } from "vitest";
import { applyReorder, planReorder } from "./ordering";

const rows = (...orders: number[]) => orders.map((displayOrder, i) => ({ id: `r${i}`, displayOrder }));

describe("planReorder (quyết định 15, 17)", () => {
  it("không trùng: đổi giá trị của hai dòng, đúng 2 lệnh", () => {
    expect(planReorder(rows(0, 1, 2), 1, -1)).toEqual([
      { id: "r1", displayOrder: 0 },
      { id: "r0", displayOrder: 1 },
    ]);
    expect(planReorder(rows(10, 20, 35), 1, 1)).toEqual([
      { id: "r1", displayOrder: 35 },
      { id: "r2", displayOrder: 20 },
    ]);
  });

  it("toàn 0: đánh số lại cả danh sách 0..n-1 sau khi đổi, chỉ gửi dòng đổi giá trị (dòng đầu vẫn 0 nên bỏ)", () => {
    // đổi r2 lên một bậc: thứ tự mới r0, r2, r1 → 0,1,2; r0 đã là 0 nên không gửi
    expect(planReorder(rows(0, 0, 0), 2, -1)).toEqual([
      { id: "r2", displayOrder: 1 },
      { id: "r1", displayOrder: 2 },
    ]);
    // đổi r0 xuống: r1, r0, r2 → r1 = 0 (đã 0, bỏ), r0 = 1, r2 = 2
    expect(planReorder(rows(0, 0, 0), 0, 1)).toEqual([
      { id: "r0", displayOrder: 1 },
      { id: "r2", displayOrder: 2 },
    ]);
  });

  it("trùng một phần (ở chỗ khác): vẫn đánh số lại cả danh sách", () => {
    // 0, 1, 1, 5 : đổi r0 xuống → r1, r0, r2, r3 → 0,1,2,3 ; r1 = 0 (đổi từ 1), r0 = 1 (đổi từ 0), r2 = 2 (từ 1), r3 = 3 (từ 5)
    expect(planReorder(rows(0, 1, 1, 5), 0, 1)).toEqual([
      { id: "r1", displayOrder: 0 },
      { id: "r0", displayOrder: 1 },
      { id: "r2", displayOrder: 2 },
      { id: "r3", displayOrder: 3 },
    ]);
  });

  it("ra ngoài danh sách → null", () => {
    expect(planReorder(rows(0, 1), 0, -1)).toBeNull();
    expect(planReorder(rows(0, 1), 1, 1)).toBeNull();
    expect(planReorder([], 0, 1)).toBeNull();
  });
});

describe("applyReorder", () => {
  it("gửi tuần tự đúng thứ tự rồi nạp lại một lần", async () => {
    const sent: string[] = [];
    const reload = vi.fn().mockResolvedValue(undefined);
    await applyReorder(rows(3, 4), async (c) => void sent.push(`${c.id}=${c.displayOrder}`), reload);
    expect(sent).toEqual(["r0=3", "r1=4"]);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("lỗi ở lệnh giữa: dừng, không gửi lệnh sau, vẫn nạp lại, lỗi được ném tiếp", async () => {
    const sent: string[] = [];
    const reload = vi.fn().mockResolvedValue(undefined);
    const patch = async (c: { id: string }) => {
      if (c.id === "r1") throw new Error("boom");
      sent.push(c.id);
    };
    await expect(applyReorder(rows(0, 1, 2), patch, reload)).rejects.toThrow("boom");
    expect(sent).toEqual(["r0"]);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
