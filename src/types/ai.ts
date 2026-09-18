/** Kiểu dữ liệu AI Query Log. */

/** Log truy vấn AI của tenant — BR-51: lưu câu hỏi, truy vấn đã chạy và câu trả lời để truy vết. */
export type AiQueryLog = {
  id: string;
  tenantId: string;
  branchId?: string;
  /** Người dùng thực hiện truy vấn. */
  userId: string;
  query: string;
  response?: string;
  /** JSON.stringify(AiAnswer) — cho phép hiển thị lại đầy đủ bảng số/SQL khi mở lại lịch sử. */
  payloadJson?: string;
  /** Thời gian xử lý (ms). */
  latencyMs?: number;
  createdAt: string;
};
