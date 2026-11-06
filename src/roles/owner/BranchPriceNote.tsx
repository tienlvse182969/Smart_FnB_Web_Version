import { useEffect, useState } from "react";
import { Link, useInRouterContext } from "react-router-dom";
import type { PriceProductType } from "../../types";
import { branchPricesApi } from "../../api";
import { money } from "../../data";
import { useAppStore } from "../../store";
import { palette } from "../../theme";

/**
 * Mục 29.4: trang chi tiết món/combo hiện giá chuỗi và số chi nhánh đang có giá riêng (đếm từ ma trận giá của BE). Lỗi tải thì chỉ hiện giá chuỗi.
 * Chỉ Owner (BE chỉ cho Owner đọc ma trận).
 */
export default function BranchPriceNote({ type, productId, chainPrice }: { type: PriceProductType; productId: string; chainPrice: number }) {
  const chainId = useAppStore((s) => s.chainId);
  const inRouter = useInRouterContext();
  const [counts, setCounts] = useState<{ custom: number; assigned: number } | null>(null);

  useEffect(() => {
    if (!chainId) return;
    let alive = true;
    branchPricesApi.getMatrix(chainId).then(
      (matrix) => {
        if (!alive) return;
        const mine = matrix.cells.filter((c) => c.type === type && c.productId === productId);
        setCounts({ assigned: mine.length, custom: mine.filter((c) => c.priceOverride !== null).length });
      },
      () => alive && setCounts(null),
    );
    return () => {
      alive = false;
    };
  }, [chainId, type, productId]);

  return (
    <div data-testid="branch-price-note" style={{ fontSize: 12.5, color: palette.textMuted, marginTop: 6 }}>
      Giá chuỗi <b>{money(chainPrice)}</b>
      {counts ? (
        <>
          {" "}· <b>{counts.custom}</b>/{counts.assigned} chi nhánh đang có giá riêng.{" "}
        </>
      ) : null}
      {inRouter ? <Link to="/owner/menu/prices">Đặt giá theo chi nhánh</Link> : <a href="/owner/menu/prices">Đặt giá theo chi nhánh</a>}
    </div>
  );
}
