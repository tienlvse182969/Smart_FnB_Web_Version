// Tạo đơn tiền mặt mẫu cho GĐ7 trên BE LOCAL (chi nhánh Nguyễn Huệ), bằng API thu ngân và pha chế.
//
// CHỈ chạy với localhost/127.0.0.1 (thoát ngay nếu không). Mật khẩu KHÔNG nằm trong file:
//   DEMO_PASSWORD=<mật khẩu demo> node scripts/data/create-demo-orders.mjs
// Biến tuỳ chọn: BASE_URL (mặc định http://localhost:3100/api/v1), CASHIER_EMAIL, BARISTA_EMAIL.
//
// Request GHI duy nhất được gọi (ngoài đăng nhập):
//   POST /cashier/checkout, POST /cashier/orders/:id/payments/cash, POST /cashier/orders/:id/cancel,
//   POST /barista/batches/start, POST /barista/batches/complete, POST /barista/orders/:id/deliver.
// Cần sẵn một quầy ACTIVE của chi nhánh (GET /stations, lấy quầy đầu tiên); script KHÔNG tạo quầy.
// Không gọi QR/PayOS/webhook, không xác nhận thủ công. Dừng ở lỗi đầu tiên; đã tạo gì thì in ra, KHÔNG chạy lại cả bộ.
// Mỗi đơn trừ suất `remainingPortions` của món (huỷ chưa trả thì hoàn lại).
// Món có tuỳ chọn mà đang hết suất/không bán được thì bị bỏ qua: đơn dùng món thường và script ghi rõ.

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

const writes = new Map();
const created = [];

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
  if (method !== "GET" && !path.startsWith("/auth/")) {
    const key = `${method} ${path.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, "{id}")}`;
    writes.set(key, (writes.get(key) ?? 0) + 1);
  }
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${typeof json === "string" ? json : JSON.stringify(json)}`);
  return json;
}

async function login(email) {
  const j = await call(null, "POST", "/auth/login", { email, password: PASSWORD });
  return j.accessToken;
}

const money = (v) => Number(v);

function report(n, label, order) {
  const row = {
    stt: n,
    label,
    orderCode: order.orderCode,
    callNumber: order.callNumber ?? null,
    status: order.status,
    paymentStatus: order.paymentStatus,
    total: money(order.totalAmount),
  };
  created.push(row);
  console.log(`#${n} ${label}: ${row.orderCode} · số gọi ${row.callNumber ?? "—"} · ${row.status}/${row.paymentStatus} · tổng ${row.total}`);
  return row;
}

function summary() {
  console.log("\n=== Đã tạo ===");
  console.table(created);
  console.log("=== Request ghi đã gọi (ngoài đăng nhập) ===");
  console.table([...writes].map(([request, count]) => ({ request, count })));
}

let cashier;
let barista;
let stationId;
let sellable;

/** Chọn tuỳ chọn hợp lệ: mỗi nhóm bắt buộc lấy tuỳ chọn đầu tiên đang bật; nhóm topping (nếu có) thêm một tuỳ chọn. */
function pickOptions(menuItem) {
  const ids = [];
  for (const link of menuItem.optionGroups ?? []) {
    const group = link.group ?? link;
    const options = (group.options ?? []).filter((o) => o.isActive !== false);
    const isTopping = /^topping/i.test(group.code ?? group.name ?? "");
    if (!options.length) continue;
    if (group.isRequired || (group.minSelections ?? 0) > 0 || isTopping) ids.push(options[0].id);
  }
  return ids;
}

function line(name, quantity, { options = false, note } = {}) {
  const entry = sellable.find((s) => s.menuItem.name === name);
  if (!entry) throw new Error(`Món "${name}" không bán được ở chi nhánh (hết suất hoặc tắt)`);
  return {
    menuItemId: entry.menuItemId,
    quantity,
    optionIds: options ? pickOptions(entry.menuItem) : [],
    ...(note ? { specialInstructions: note } : {}),
  };
}

const checkout = (items) => call(cashier, "POST", "/cashier/checkout", { items });
const payCash = async (order, tendered) => {
  const r = await call(cashier, "POST", `/cashier/orders/${order.id}/payments/cash`, {
    stationId,
    tenderedAmount: tendered ?? money(order.totalAmount),
  });
  return r.order ?? r;
};

async function paidOrder(n, label, items, tendered) {
  const placed = await checkout(items);
  const paid = await payCash(placed, tendered === "over" ? money(placed.totalAmount) + 35000 : undefined);
  return { row: report(n, label, paid), order: paid };
}

async function main() {
  cashier = await login(CASHIER_EMAIL);
  const context = await call(cashier, "GET", "/cashier/context");
  sellable = context.menuItems.filter((m) => m.effectiveAvailable && (m.remainingPortions === null || m.remainingPortions > 0));
  const withOptions = sellable.filter((m) => (m.menuItem.optionGroups ?? []).length);
  console.log(`Chi nhánh: ${context.branch.name}. Món bán được: ${sellable.map((m) => `${m.menuItem.name} (còn ${m.remainingPortions ?? "∞"})`).join(", ")}`);
  if (!withOptions.length) console.log("LƯU Ý: không có món có tuỳ chọn bán được → mọi đơn dùng món thường, không có tuỳ chọn/topping.");

  const stations = await call(cashier, "GET", "/stations");
  const station = (Array.isArray(stations) ? stations : (stations.items ?? [])).find((s) => s.status === "ACTIVE");
  if (!station) throw new Error("Chi nhánh chưa có quầy ACTIVE. Tạo quầy ở màn Quầy và máy in rồi chạy lại.");
  stationId = station.id;
  console.log(`Quầy dùng: ${station.name}`);

  const optName = withOptions[0]?.menuItem.name;
  const canh = "Canh chua cá";
  const com = "Cơm gà nướng";

  // 1. Tiền mặt đã trả, 1 món (có tuỳ chọn nếu bán được), khách đưa dư để có tiền thối.
  await paidOrder(1, "tiền mặt đã trả, đưa dư", [line(optName ?? com, 1, { options: !!optName })], "over");
  // 2. Tiền mặt đã trả, 3 dòng khác nhau.
  await paidOrder(2, "tiền mặt đã trả, 3 dòng", [
    line(canh, 1),
    line(com, 2, { note: "ít cơm" }),
    line(optName ?? canh, 1, { options: !!optName, note: "ít cay" }),
  ]);
  // 3. Chốt đơn, chưa trả.
  report(3, "chốt đơn, chưa trả", await checkout([line(com, 1)]));
  // 4. Đã trả → pha chế làm xong → Đã giao.
  const four = await paidOrder(4, "đã trả (sẽ pha và giao)", [line(com, 1), line(canh, 1)]);
  barista = await login(BARISTA_EMAIL);
  const queue = await call(barista, "GET", "/barista/queue");
  const batches = Array.isArray(queue) ? queue : (queue.batches ?? []);
  const unitIds = batches.flatMap((b) => b.units).filter((u) => u.callNumber === four.order.callNumber).map((u) => u.id);
  if (!unitIds.length || unitIds.length > 4) throw new Error(`Không tìm đúng đơn vị món của đơn 4 trong hàng đợi (tìm được ${unitIds.length})`);
  await call(barista, "POST", "/barista/batches/start", { unitIds });
  await call(barista, "POST", "/barista/batches/complete", { unitIds });
  const delivered = await call(barista, "POST", `/barista/orders/${four.order.id}/deliver`);
  created[created.length - 1] = { ...created[created.length - 1], status: delivered.status, paymentStatus: delivered.paymentStatus };
  console.log(`   → pha xong và giao: ${delivered.status}`);
  // 5. Chốt rồi huỷ khi chưa trả, kèm lý do.
  const five = await checkout([line(canh, 1)]);
  await call(cashier, "POST", `/cashier/orders/${five.id}/cancel`, { reason: "Khách đổi ý trước khi trả tiền" });
  const fiveAfter = await call(cashier, "GET", `/cashier/orders/${five.id}`);
  report(5, "chốt rồi huỷ chưa trả", fiveAfter);
  // 6–11. Sáu đơn tiền mặt đã trả đơn giản.
  const simple = [
    [com, 1],
    [canh, 1],
    [com, 2],
    [com, 1],
    [canh, 1],
    [com, 1],
  ];
  for (const [i, [name, qty]] of simple.entries()) await paidOrder(6 + i, `tiền mặt đã trả, ${name} ×${qty}`, [line(name, qty)]);
}

try {
  await main();
  summary();
} catch (err) {
  console.error(`\nLỖI: ${err.message}`);
  summary();
  console.error("Dừng ở lỗi đầu tiên. KHÔNG chạy lại cả bộ: đối chiếu bảng trên rồi tạo bù phần còn thiếu.");
  process.exit(1);
}
