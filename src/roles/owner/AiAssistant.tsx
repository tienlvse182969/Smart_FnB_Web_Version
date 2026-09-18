import { useEffect, useRef, useState } from "react";
import { Button, Card, Input, Table, Tag } from "antd";
import { AlertTriangle, Clock, Code2, Send, Sparkles } from "lucide-react";
import type { AiQueryLog } from "../../types";
import { askAssistant, listAiQueryLogs, logAiQuery, SAMPLE_QUESTIONS, type AiAnswer } from "../../services";
import { SectionTitle } from "../../components/bits";
import { useAppStore } from "../../store";

type ChatMessage = { role: "user"; text: string } | { role: "assistant"; answer: AiAnswer };

/**
 * OW-14: Trợ lý số liệu (mục 9) — chat hỏi đáp bằng tiếng Việt, mọi số liệu
 * lấy từ dữ liệu mock thật (BR-50), không có backend/mô hình AI thật ở bước
 * này. `askAssistant` là hàm async — sau này đổi sang gọi API thật không
 * phải sửa file này.
 */
export default function AiAssistant() {
  const currentUser = useAppStore((s) => s.currentUser);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<AiQueryLog[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const tenantId = currentUser?.tenantId ?? null;

  const loadHistory = () => {
    if (tenantId) listAiQueryLogs(tenantId).then(setHistory);
  };
  useEffect(loadHistory, [tenantId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const ask = async (question: string) => {
    if (!tenantId || !currentUser || !question.trim() || loading) return;
    setMessages((p) => [...p, { role: "user", text: question }]);
    setInput("");
    setLoading(true);
    const startedAt = Date.now();
    try {
      const answer = await askAssistant(tenantId, currentUser.id, question);
      setMessages((p) => [...p, { role: "assistant", answer }]);
      await logAiQuery(tenantId, currentUser.id, answer, Date.now() - startedAt);
      loadHistory();
    } finally {
      setLoading(false);
    }
  };

  const openHistoryEntry = (log: AiQueryLog) => {
    if (!log.payloadJson) return;
    const answer = JSON.parse(log.payloadJson) as AiAnswer;
    setMessages((p) => [...p, { role: "user", text: log.query }, { role: "assistant", answer }]);
  };

  return (
    <div>
      <SectionTitle title="Trợ lý số liệu" sub="Hỏi bằng tiếng Việt, nhận số liệu thật kèm diễn giải (mục 9)" />
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 8fr) minmax(0, 4fr)", gap: 16, alignItems: "start" }}>
        <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 0 } }}>
          <div ref={scrollRef} style={{ height: 480, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
            {messages.length === 0 && (
              <div style={{ color: "#a1a1aa", fontSize: 13, textAlign: "center", marginTop: 40 }}>
                Bấm một câu gợi ý bên dưới hoặc tự gõ câu hỏi của bạn.
              </div>
            )}
            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} style={{ alignSelf: "flex-end", background: "#0a0a0a", color: "#fff", borderRadius: "14px 14px 2px 14px", padding: "10px 16px", maxWidth: "75%", fontSize: 14 }}>
                  {m.text}
                </div>
              ) : (
                <AnswerCard key={i} answer={m.answer} />
              )
            )}
            {loading && <div style={{ color: "#a1a1aa", fontSize: 13 }}>Đang tính…</div>}
          </div>

          <div style={{ borderTop: "1px solid var(--ant-color-border)", padding: 16 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              {SAMPLE_QUESTIONS.map((q) => (
                <Button key={q} size="small" icon={<Sparkles size={12} />} onClick={() => ask(q)} disabled={loading}>
                  {q}
                </Button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Input
                size="large"
                placeholder="VD: Doanh thu hôm nay chi nhánh nào cao nhất?"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onPressEnter={() => ask(input)}
                disabled={loading}
              />
              <Button type="primary" size="large" icon={<Send size={16} />} loading={loading} onClick={() => ask(input)}>
                Hỏi
              </Button>
            </div>
          </div>
        </Card>

        <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 16 } }}>
          <SectionTitle title="Lịch sử hỏi đáp" />
          {history.length === 0 ? (
            <div style={{ fontSize: 13, color: "#a1a1aa" }}>Chưa có câu hỏi nào.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 460, overflowY: "auto" }}>
              {history.map((log) => (
                <button
                  key={log.id}
                  onClick={() => openHistoryEntry(log)}
                  style={{ textAlign: "left", cursor: "pointer", border: "1px solid var(--ant-color-border)", borderRadius: 10, padding: "10px 12px", background: "#fff", font: "inherit" }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>{log.query}</div>
                  <div style={{ fontSize: 11.5, color: "#a1a1aa", display: "flex", alignItems: "center", gap: 5 }}>
                    <Clock size={11} /> {new Date(log.createdAt).toLocaleString("vi-VN")}
                    {log.latencyMs != null && <span>· {log.latencyMs}ms</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function AnswerCard({ answer }: { answer: AiAnswer }) {
  const [showSql, setShowSql] = useState(false);

  return (
    <div style={{ alignSelf: "flex-start", background: "#f4f4f5", borderRadius: "14px 14px 14px 2px", padding: 16, maxWidth: "88%" }}>
      {answer.refused && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#ad6800", fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
          <AlertTriangle size={13} /> Ngoài phạm vi dữ liệu
        </div>
      )}
      {answer.unmatched && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#71717a", fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
          <AlertTriangle size={13} /> Chưa nhận ra mẫu câu hỏi
        </div>
      )}
      <div style={{ fontSize: 14, lineHeight: 1.6, marginBottom: answer.table ? 12 : 0 }}>{answer.narrative}</div>

      {answer.table && answer.table.rows.length > 0 && (
        <Table
          size="small"
          pagination={false}
          dataSource={answer.table.rows.map((row, i) => ({ key: i, ...Object.fromEntries(row.map((v, ci) => [`c${ci}`, v])) }))}
          columns={answer.table.columns.map((c, ci) => ({ title: c, dataIndex: `c${ci}` }))}
          style={{ background: "#fff", borderRadius: 8, marginBottom: 10 }}
        />
      )}

      {!answer.refused && !answer.unmatched && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <Tag>{answer.periodLabel}</Tag>
          <Tag color="blue">View: {answer.viewName}</Tag>
          <Button size="small" icon={<Code2 size={12} />} onClick={() => setShowSql((v) => !v)}>
            {showSql ? "Ẩn truy vấn" : "Xem truy vấn"}
          </Button>
        </div>
      )}
      {showSql && (
        <pre style={{ marginTop: 10, background: "#0a0a0a", color: "#e4e4e7", borderRadius: 8, padding: 12, fontSize: 12, overflowX: "auto" }}>
          {answer.sql}
        </pre>
      )}
    </div>
  );
}
