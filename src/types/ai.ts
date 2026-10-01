/** Kiểu dữ liệu AI Query Log. */

/** Log truy vấn AI của tenant — BR-40: lưu câu hỏi, truy vấn đã chạy và câu trả lời để truy vết. */
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

export interface AiAnswerTable {
  columns: string[];
  rows: (string | number)[][];
}

export interface AiAnswer {
  id: string;
  query: string;
  /** Khoảng thời gian trợ lý đã hiểu từ câu hỏi, diễn giải cho người đọc. */
  periodLabel: string;
  /** Tên "view báo cáo" đã dùng (BR-38) — không phải bảng dữ liệu thô. */
  viewName: string;
  /** Câu SQL minh hoạ hiển thị khi bấm "Xem truy vấn" — không thực sự chạy SQL. */
  sql: string;
  /** Câu diễn giải bằng tiếng Việt — mọi số liệu nhắc tới đều lấy từ `table` (BR-39). */
  narrative: string;
  table: AiAnswerTable | null;
  /** true nếu bị từ chối vì ngoài phạm vi dữ liệu cho phép. */
  refused?: boolean;
  /** true nếu câu hỏi không khớp mẫu nào. */
  unmatched?: boolean;
}
