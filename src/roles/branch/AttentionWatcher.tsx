import { useCallback, useEffect, useMemo, useRef } from "react";
import { App, Button } from "antd";
import { useNavigate } from "react-router-dom";
import { modeOf, orderApi } from "../../api";
import {
  type AlertBatcher,
  ATTENTION_STATUS,
  attentionItemsOf,
  createAlertBatcher,
  createPoller,
  describeAttentionBatch,
} from "../../api/modules/order/attention";
import { useOrderRealtime } from "../../api/realtime/useOrderRealtime";
import { formatVnd } from "../../lib/reportFormat";
import { useAppStore } from "../../store";
import { attentionStore } from "./attentionStore";

/**
 * Gắn MỘT lần cho khu Manager (RoleLayout): giữ số đếm "Đơn cần xử lý" trên menu (quyết định 100–101).
 *  - nạp số đếm bằng GET lọc `REQUIRES_ATTENTION` (limit 1, lấy `total`);
 *  - socket: dùng lại `useOrderRealtime` (chung MỘT kết nối với các màn đơn) — mọi sự kiện đơn → GET lại số đếm (gom 500 ms của hook);
 *    sự kiện `manager.order.attention-required` → thêm 1 thông báo tiếng Việt có nút Xem (gom 2 giây, không trùng theo đơn);
 *  - dự phòng tới khi BE có #51: tải lại 60 giây khi tab hiển thị, dừng khi ẩn, tải ngay khi hiện lại.
 * Lỗi đọc đã được lớp API báo (toast kèm Thử lại); ở đây giữ số cũ, không báo thêm.
 */
export default function AttentionWatcher() {
  const { notification } = App.useApp();
  const navigate = useNavigate();
  const chainId = useAppStore((s) => s.chainId);
  const branchId = useAppStore((s) => s.currentBranchId);

  const load = useCallback(async () => {
    if (!chainId || !branchId) return;
    try {
      const page = await orderApi.listOrders({ chainId, branchId }, { status: ATTENTION_STATUS, page: 1, limit: 1 });
      attentionStore.set(page.total);
    } catch {
      // giữ số cũ
    }
  }, [chainId, branchId]);
  const loadRef = useMemo(() => ({ current: load }), []);
  loadRef.current = load;

  useEffect(() => {
    attentionStore.set(null);
    void load();
  }, [load]);

  // Dự phòng #51: 60 giây khi tab hiển thị.
  useEffect(() => {
    if (!chainId || !branchId) return;
    const visible = () => typeof document === "undefined" || document.visibilityState !== "hidden";
    const poller = createPoller({ load: () => void loadRef.current(), isVisible: visible });
    const onVisibility = () => poller.onVisibilityChange();
    document.addEventListener("visibilitychange", onVisibility);
    poller.start();
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      poller.dispose();
    };
  }, [chainId, branchId, loadRef]);

  // Cảnh báo: gom 2 giây, không trùng theo đơn. Tạo TRONG effect (không useMemo): React StrictMode (dev) chạy cleanup rồi effect lại,
  // một batcher tạo bằng useMemo sẽ bị `dispose` vĩnh viễn và nuốt mọi cảnh báo.
  const batcherRef = useRef<AlertBatcher | null>(null);
  useEffect(() => {
    const batcher = createAlertBatcher({
      onBatch: (items) => {
        for (const a of describeAttentionBatch(items, formatVnd)) {
          notification.open({
            key: a.key,
            type: a.tone === "error" ? "error" : "warning",
            message: "Đơn cần xử lý",
            description: a.text,
            duration: 12,
            actions: (
              <Button
                size="small"
                type="primary"
                data-testid="attention-alert-view"
                onClick={() => {
                  notification.destroy(a.key);
                  navigate(a.to);
                }}
              >
                Xem
              </Button>
            ),
          });
        }
      },
    });
    batcherRef.current = batcher;
    return () => {
      batcher.dispose();
      batcherRef.current = null;
    };
  }, [notification, navigate]);

  useOrderRealtime(() => void loadRef.current(), {
    enabled: modeOf("order") === "real" && !!branchId,
    onEvent: (event) => batcherRef.current?.push(attentionItemsOf(event)),
  });

  return null;
}
