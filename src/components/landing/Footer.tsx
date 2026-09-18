export default function Footer() {
  return (
    <footer className="border-t border-zinc-200 py-10">
      <div className="mx-auto max-w-6xl px-6 text-sm text-zinc-500">
        <p>Smart F&B Chain Platform — phần mềm vận hành chuỗi quán ăn, thuê theo tháng.</p>
        <p className="mt-2">© {new Date().getFullYear()} Smart F&B. Không có đăng ký tự động, không có dùng thử.</p>
      </div>
    </footer>
  );
}
