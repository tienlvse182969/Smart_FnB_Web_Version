/**
 * Màn hình gọi số (đặc tả 4.5 và 11.10): hiện các số đang pha và các số mời
 * nhận, chạy trên trình duyệt TV/tablet ở khu nhận món. Không phải use case
 * (14.3). Placeholder — chờ backend có cách ghép màn hình gọi số, xác thực token
 * thiết bị và event realtime.
 */
export default function CallScreen() {
  return (
    <div style={{ textAlign: "center", maxWidth: 520 }}>
      <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>Màn hình gọi số</div>
      <div style={{ color: "var(--ant-color-text-secondary)", lineHeight: 1.7 }}>
        Chưa có dữ liệu. Màn hình này sẽ hiện số đang pha và số mời nhận sau khi được Branch Manager
        ghép bằng mã (BR-45).
      </div>
    </div>
  );
}
