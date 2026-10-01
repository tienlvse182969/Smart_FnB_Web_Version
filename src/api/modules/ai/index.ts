/** Module ai — trợ lý số liệu (OW-09). Chỉ Owner gói Nâng cao dùng được (BR-40). Mock cho tới giai đoạn 9. */
import type { AiAnswer, AiQueryLog } from "../../../types";
import { defineApi } from "../../define";
import { aiMock } from "./mock";

export type { AiAnswer } from "../../../types";

/** 6 câu hỏi gợi ý sẵn trên giao diện — 3 câu theo khoảng thời gian đã qua + 3 câu "hôm nay" luôn có dữ liệu để demo. */
export const SAMPLE_QUESTIONS: string[] = [
  "Tuần trước chi nhánh nào doanh thu cao nhất?",
  "Top 5 món bán chạy tháng này",
  "Thứ Bảy vừa rồi mỗi chi nhánh có bao nhiêu đơn?",
  "Hôm nay chi nhánh nào doanh thu cao nhất?",
  "Top 5 món bán chạy hôm nay",
  "Hôm nay mỗi chi nhánh có bao nhiêu đơn?",
];

export interface AiApi {
  ask(chainId: string, userId: string, query: string): Promise<AiAnswer>;
  /** Lưu câu hỏi, truy vấn đã chạy và câu trả lời để truy vết (BR-40). */
  logQuery(chainId: string, userId: string, answer: AiAnswer, latencyMs: number): Promise<AiQueryLog>;
  listLogs(chainId: string): Promise<AiQueryLog[]>;
}

// CHỜ BE: OW-09 chưa có endpoint. Bản real viết ở giai đoạn 9.
export const aiApi = defineApi<AiApi>("ai", { mock: aiMock });
