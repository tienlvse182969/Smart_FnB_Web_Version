/**
 * Dựng một module API từ hai bản cài đặt dùng chung một interface.
 *
 * Mọi hàm của module được bọc `reportApiError`, nên real và mock báo lỗi (403, hạn mức, mạng…) qua
 * cùng một đường. Màn hình chỉ giữ tham chiếu tới interface, không biết đang chạy bản nào.
 */
import { modeOf, type ApiMode, type ApiModule } from "./flags";
import { ApiError, reportApiError } from "./http/errors";

export interface ApiImpls<T> {
  /** Chưa viết = chưa nối BE; cờ `real` rơi về mock kèm cảnh báo. */
  real?: T;
  mock: T;
}

/**
 * CHỈ DÙNG CHO MOCK (mock không đi qua lớp http nên không có phương thức HTTP): hàm có tên bắt đầu bằng các tiền tố này coi như đọc.
 * Real không dùng tên hàm: đọc/ghi lấy từ phương thức HTTP của request (`ApiError.method`, gắn ở `http/client.ts`).
 */
const READ_PREFIX = /^(list|get|load|find|count)/;

export function selectImpl<T>(module: ApiModule, mode: ApiMode, impls: ApiImpls<T>): T {
  if (mode === "real") {
    if (impls.real) return impls.real;
    console.warn(`[api] module "${module}" chưa có bản real — dùng mock.`);
  }
  return impls.mock;
}

export function wrapWithErrorHandling<T extends object>(impl: T): T {
  return new Proxy(impl, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== "function" || typeof prop !== "string") return value;
      return (...args: unknown[]) => {
        return (value.apply(target, args) as Promise<unknown>).catch((err: unknown) => {
          // Real: `request()` đã gắn phương thức HTTP. Mock không đi qua HTTP nên gắn tạm theo tên hàm (chỉ khi chưa có).
          if (err instanceof ApiError && err.method === undefined) err.method = READ_PREFIX.test(prop) ? "GET" : "POST";
          reportApiError(err);
          throw err;
        });
      };
    },
  });
}

export function defineApi<T extends object>(module: ApiModule, impls: ApiImpls<T>, mode: ApiMode = modeOf(module)): T {
  return wrapWithErrorHandling(selectImpl(module, mode, impls));
}
