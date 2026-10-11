// Tạo MỘT đơn tiền mặt mới (và đưa nó qua pha chế từng bước) trên BE LOCAL, dùng cho kiểm realtime của GĐ7 (khối `realtime` của phase7.mjs).
//
// CHỈ chạy với localhost/127.0.0.1 (thoát ngay nếu không). Mật khẩu KHÔNG nằm trong file:
//   DEMO_PASSWORD=<mật khẩu demo> node scripts/data/create-one-cash-order.mjs create
//   DEMO_PASSWORD=… node scripts/data/create-one-cash-order.mjs start    <orderId> <callNumber>
//   DEMO_PASSWORD=… node scripts/data/create-one-cash-order.mjs complete <orderId> <callNumber>
//   DEMO_PASSWORD=… node scripts/data/create-one-cash-order.mjs deliver  <orderId>
// Biến tuỳ chọn: BASE_URL (mặc định http://localhost:3100/api/v1), CASHIER_EMAIL, BARISTA_EMAIL, ITEM_NAME (mặc định "Cơm gà nướng").
//
// Request GHI duy nhất được gọi (ngoài đăng nhập):
//   create:   POST /cashier/checkout, POST /cashier/orders/:id/payments/cash        (thu ngân, quầy ACTIVE đầu tiên của GET /stations)
//   start:    POST /barista/batches/start                                           (pha chế)
//   complete: POST /barista/batches/complete                                        (cùng người pha chế)
//   deliver:  POST /barista/orders/:id/deliver                                      (đơn phải đang Sẵn sàng)
// Không tạo quầy, không QR/PayOS/webhook, không xác nhận thủ công, không huỷ. Mỗi `create` trừ 1 suất món.
// In đúng MỘT dòng JSON ở cuối (id, orderCode, callNumber, status, paymentStatus) để script gọi đọc; request ghi in ra stderr.

const BASE_URL = (process.env.BASE_URL ?? "http://localhost:3100/api/v1").replace(/\/$/, "");
const host = new URL(BASE_URL).hostname;
if (host !== "localhost" && host !== "127.0.0.1") {
  console.error(`Từ chối chạy: ${host} không phải localhost/127.0.0.1.`);
  process.exit(1);
}
const PASSWORD = process.env.DEMO_PASSWORD;
if (!PASSWORD) {
  console.error("Thiếu biến môi trường DEMO_PASSWORD.");
  process.exit(1);
}
const CASHIER_EMAIL = process.env.CASHIER_EMAIL ?? "cashier.demo@smartfnb.local";
const BARISTA_EMAIL = process.env.BARISTA_EMAIL ?? "barista.demo@smartfnb.local";
const ITEM_NAME = process.env.ITEM_NAME ?? "Cơm gà nướng";

async function call(token, method, path, body) {
  const res = await fetch(BASE_URL + path, {
    method,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  if (method !== "GET" && !path.startsWith("/auth/")) console.error(`WRITE ${method} ${path.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, "{id}")} → ${res.status}`);
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${typeof json === "string" ? json : JSON.stringify(json)}`);
  return json;
}

const login = async (email) => (await call(null, "POST", "/auth/login", { email, password: PASSWORD })).accessToken;
const out = (order) =>
  console.log(JSON.stringify({ id: order.id, orderCode: order.orderCode, callNumber: order.callNumber ?? null, status: order.status, paymentStatus: order.paymentStatus }));

/** Đơn vị món của đơn (theo số gọi) trong hàng đợi pha chế; tối đa 4 mỗi mẻ. */
async function unitsOf(barista, callNumber) {
  const queue = await call(barista, "GET", "/barista/queue");
  const batches = Array.isArray(queue) ? queue : (queue.batches ?? []);
  const ids = batches.flatMap((b) => b.units).filter((u) => String(u.callNumber) === String(callNumber)).map((u) => u.id);
  if (!ids.length || ids.length > 4) throw new Error(`Không tìm đúng đơn vị món của số gọi ${callNumber} (tìm được ${ids.length})`);
  return ids;
}

async function main() {
  const [command, orderId, callNumber] = process.argv.slice(2);
  if (command === "create") {
    const cashier = await login(CASHIER_EMAIL);
    const context = await call(cashier, "GET", "/cashier/context");
    const entry = context.menuItems.find((m) => m.menuItem.name === ITEM_NAME && m.effectiveAvailable && (m.remainingPortions === null || m.remainingPortions > 0));
    if (!entry) throw new Error(`Món "${ITEM_NAME}" không bán được ở chi nhánh (hết suất hoặc tắt)`);
    const stations = await call(cashier, "GET", "/stations");
    const station = (Array.isArray(stations) ? stations : (stations.items ?? [])).find((s) => s.status === "ACTIVE");
    if (!station) throw new Error("Chi nhánh chưa có quầy ACTIVE.");
    const placed = await call(cashier, "POST", "/cashier/checkout", { items: [{ menuItemId: entry.menuItemId, quantity: 1, optionIds: [] }] });
    const paid = await call(cashier, "POST", `/cashier/orders/${placed.id}/payments/cash`, { stationId: station.id, tenderedAmount: Number(placed.totalAmount) });
    out(paid.order ?? paid);
  } else if (command === "start" || command === "complete") {
    if (!orderId || !callNumber) throw new Error(`Cú pháp: ${command} <orderId> <callNumber>`);
    const barista = await login(BARISTA_EMAIL);
    const unitIds = await unitsOf(barista, callNumber);
    await call(barista, "POST", `/barista/batches/${command}`, { unitIds });
    const detail = await call(barista, "GET", "/barista/ready-orders").catch(() => null);
    out({ id: orderId, orderCode: null, callNumber: Number(callNumber), status: command === "start" ? "PREPARING" : "READY", paymentStatus: "PAID", ready: Array.isArray(detail) ? detail.length : null });
  } else if (command === "deliver") {
    if (!orderId) throw new Error("Cú pháp: deliver <orderId>");
    const barista = await login(BARISTA_EMAIL);
    out(await call(barista, "POST", `/barista/orders/${orderId}/deliver`));
  } else {
    throw new Error("Lệnh: create | start | complete | deliver");
  }
}

try {
  await main();
} catch (err) {
  console.error(`LỖI: ${err.message}`);
  process.exit(1);
}
