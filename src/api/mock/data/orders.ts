/**
 * Sinh đơn mock theo v9, xác định theo chi nhánh (cùng chi nhánh → cùng dữ liệu):
 * - trải 28 ngày gần nhất, nhiều chi nhánh với lưu lượng khác nhau;
 * - đủ trạng thái: đã thanh toán tiền mặt, QR, Cần xử lý, đã huỷ kèm trạng thái hoàn;
 * - đơn chụp giá lúc bán (BR-15): tên/giá món và tên/giá cộng thêm của từng tuỳ chọn, kể cả khi menu hiện
 *   tại đã đổi giá.
 */
import type {
  Order,
  OrderLine,
  OrderLineOption,
  OrderLineStatus,
  OrderStatus,
  OptionGroup,
  PaymentMethod,
  PaymentStatus,
  RefundStatus,
} from "../../../types";
import { hashString, mulberry32, pick } from "../prng";

export const ORDER_HISTORY_DAYS = 28;

/** Phần của món mà bộ sinh đơn cần. */
export type OrderableItem = { id: string; name: string; price: number; isActive: boolean; optionGroupIds?: string[] };

const DAY_MS = 86_400_000;

interface GenerateInput {
  chainId: string;
  branchId: string;
  /** Hệ số lưu lượng của chi nhánh. */
  traffic: number;
  items: OrderableItem[];
  groups: OptionGroup[];
  now: Date;
}

function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function buildLine(
  rng: () => number,
  item: OrderableItem,
  groups: Map<string, OptionGroup>,
  seq: number,
): OrderLine {
  const quantity = rng() < 0.78 ? 1 : 2;
  const options: OrderLineOption[] = [];
  for (const groupId of item.optionGroupIds ?? []) {
    const group = groups.get(groupId);
    if (!group) continue;
    const active = group.options.filter((o) => o.isActive);
    if (group.maxSelections > 1) {
      // Nhóm chọn nhiều (topping): 0..maxSelect
      const count = rng() < 0.5 ? 0 : 1 + Math.floor(rng() * group.maxSelections);
      const chosen = [...active].sort(() => rng() - 0.5).slice(0, count);
      for (const o of chosen) options.push({ groupName: group.name, optionName: o.name, priceDelta: o.priceDelta });
    } else {
      const byDefault = active.find((o) => o.isDefault);
      const chosen = rng() < 0.65 && byDefault ? byDefault : pick(rng, active);
      options.push({ groupName: group.name, optionName: chosen.name, priceDelta: chosen.priceDelta });
    }
  }
  // Một phần đơn cũ bán theo giá cũ — thể hiện giá đã chụp lúc bán, không đổi theo menu hiện tại.
  const unitPrice = rng() < 0.12 ? Math.max(1000, item.price - 3000) : item.price;
  const extras = options.reduce((sum, o) => sum + o.priceDelta, 0);
  return {
    id: `l${seq}`,
    menuItemId: item.id,
    name: item.name,
    unitPrice,
    quantity,
    options,
    status: "done",
    lineTotal: (unitPrice + extras) * quantity,
  };
}

function setLineStatus(lines: OrderLine[], status: OrderLineStatus): OrderLine[] {
  return lines.map((l) => ({ ...l, status }));
}

/** Trạng thái một đơn theo tuổi: đơn hôm nay còn đang chạy, đơn cũ đã hoàn tất. */
function liveStatus(ageMin: number): OrderStatus {
  if (ageMin < 4) return "paid";
  if (ageMin < 12) return "preparing";
  if (ageMin < 20) return "ready";
  return "completed";
}

export function generateBranchOrders({ chainId, branchId, traffic, items, groups, now }: GenerateInput): Order[] {
  const rng = mulberry32(hashString(`orders:${branchId}`));
  const groupMap = new Map(groups.map((g) => [g.id, g]));
  const sellable = items.filter((i) => i.isActive);
  const today = startOfLocalDay(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const orders: Order[] = [];
  let seq = 0;

  for (let d = 0; d < ORDER_HISTORY_DAYS; d++) {
    const day = new Date(today.getTime() - d * DAY_MS);
    const weekend = day.getDay() === 0 || day.getDay() === 6;
    const base = (12 + Math.floor(rng() * 14)) * traffic * (weekend ? 1.3 : 1);
    const count = Math.max(4, Math.round(base));

    const dayOrders: Order[] = [];
    for (let k = 0; k < count; k++) {
      // Hôm nay, trước hoặc ngay sau giờ mở cửa (< 07:30): đơn mẫu mà rơi vào khung 07:00–21:30 đều nằm ở tương lai và bị bỏ,
      // làm "hôm nay" và "tháng này" (sáng mùng 1) rỗng tuỳ giờ chạy. Dồn đơn hôm nay vào 90 phút vừa qua; mỗi đơn vẫn một lần gọi rng().
      const minute =
        d === 0 && nowMin < 7 * 60 + 30
          ? Math.max(0, nowMin - 90) + Math.floor(rng() * Math.min(90, nowMin + 1))
          : 7 * 60 + Math.floor(rng() * (14.5 * 60));
      const createdAt = new Date(day.getTime() + minute * 60_000);
      if (createdAt.getTime() > now.getTime()) continue;

      const lineCount = rng() < 0.6 ? 1 : rng() < 0.7 ? 2 : 3;
      const lines: OrderLine[] = [];
      for (let i = 0; i < lineCount; i++) lines.push(buildLine(rng, pick(rng, sellable), groupMap, ++seq));
      const total = lines.reduce((s, l) => s + l.lineTotal, 0);

      const paymentMethod: PaymentMethod = rng() < 0.58 ? "cash" : "qr";
      let status: OrderStatus = d === 0 ? liveStatus((now.getTime() - createdAt.getTime()) / 60_000) : "completed";
      let paymentStatus: PaymentStatus = "paid";
      let finalLines = lines;
      let cancelReason: string | undefined;
      let refund: Order["refund"];

      const roll = rng();
      if (roll < 0.03) {
        // Huỷ trước khi trả tiền: không số gọi, không hoàn tiền.
        status = "cancelled";
        paymentStatus = paymentMethod === "qr" && rng() < 0.5 ? "expired" : "cancelled";
        finalLines = setLineStatus(lines, "cancelled");
        cancelReason = paymentStatus === "expired" ? "QR hết hạn" : "Khách bỏ đi";
      } else if (roll < 0.05 && d > 0) {
        // Huỷ sau khi trả tiền (chỉ Manager — BR-18): ghi trạng thái hoàn (BR-49).
        status = "cancelled";
        finalLines = setLineStatus(lines, "cancelled");
        cancelReason = pick(rng, ["Khách đổi ý", "Pha nhầm món", "Khách yêu cầu hoàn"]);
        const status2: RefundStatus =
          paymentMethod === "cash" ? "refundedCash" : d <= 3 ? "awaitingOwnerRefund" : "refunded";
        refund = { amount: total, status: status2 };
      } else if (roll < 0.065 && d <= 3 && paymentMethod === "qr") {
        // Webhook báo số tiền lệch (BR-28): chờ Manager xử lý.
        status = "needsAttention";
        paymentStatus = "amountMismatch";
        finalLines = setLineStatus(lines, "queued");
      } else if (status === "paid") {
        finalLines = setLineStatus(lines, "queued");
      } else if (status === "preparing") {
        finalLines = lines.map((l, i) => ({ ...l, status: i === 0 ? ("preparing" as const) : ("queued" as const) }));
      }

      dayOrders.push({
        id: "",
        callNumber: null,
        chainId,
        branchId,
        createdAt: createdAt.toISOString(),
        status,
        paymentMethod,
        paymentStatus,
        lines: finalLines,
        total,
        cancelReason,
        refund,
      });
    }

    // Số gọi cấp đúng lúc đơn Đã thanh toán, tăng dần trong ngày, bắt đầu lại mỗi ngày (BR-22).
    dayOrders.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    let call = 0;
    const stamp = day.toISOString().slice(0, 10).replace(/-/g, "");
    dayOrders.forEach((o, i) => {
      o.id = `${branchId}-${stamp}-${String(i + 1).padStart(3, "0")}`;
      const paidOnce = o.paymentStatus === "paid" || o.refund !== undefined;
      if (paidOnce) o.callNumber = ++call;
    });
    orders.push(...dayOrders);
  }

  return orders;
}

// ---------------------------------------------------------------------------
// Doanh thu theo BR-50: đơn đã thanh toán cộng vào ngày bán; đơn bị huỷ sau khi thanh toán bị trừ
// vào ngày huỷ — số liệu ngày đã qua không bị sửa lại. Mock coi ngày huỷ = 1 ngày sau ngày bán
// (hoặc cùng ngày nếu là hôm nay).
// ---------------------------------------------------------------------------

export interface RevenueEvent {
  at: Date;
  amount: number;
  orderId: string;
}

export function revenueEvents(order: Order, now: Date): RevenueEvent[] {
  const soldAt = new Date(order.createdAt);
  const events: RevenueEvent[] = [];
  const counted =
    order.paymentStatus === "paid" || (order.status === "cancelled" && order.refund !== undefined);
  if (!counted) return events;
  events.push({ at: soldAt, amount: order.total, orderId: order.id });
  if (order.status === "cancelled" && order.refund) {
    const cancelAt = new Date(Math.min(now.getTime(), soldAt.getTime() + DAY_MS));
    events.push({ at: cancelAt, amount: -order.refund.amount, orderId: order.id });
  }
  return events;
}
