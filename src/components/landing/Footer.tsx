export default function Footer() {
  return (
    <footer className="border-t border-zinc-200 py-10">
      <div className="mx-auto max-w-6xl px-6 text-sm text-zinc-500">
        <p>Smart F&B Chain Platform — phần mềm bán hàng tại quầy cho chuỗi đồ uống, thuê theo tháng.</p>
        <p className="mt-2">© {new Date().getFullYear()} Smart F&B. Đăng ký được xét duyệt trước khi bắt đầu dùng thử 14 ngày.</p>
      </div>
    </footer>
  );
}
