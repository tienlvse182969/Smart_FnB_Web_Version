import type {
  AuthUser,
  Branch,
  BranchMenuItem,
  FloorTable,
  MenuItem,
  TableSession,
  WorkSession,
} from "../types";
import type { BranchOrderLine, SubmitOrderResult } from "./order.service";
import { apiRequest, saveAccessToken } from "./api";

type BackendItem = {
  id: string;
  orderId: string;
  menuItemId: string;
  itemName: string;
  unitPrice: string;
  quantity: number;
  specialInstructions?: string;
  status: string;
  queuedAt?: string;
  startedAt?: string;
  readyAt?: string;
  servedAt?: string;
  servedByWaiterId?: string;
};
type BackendOrder = {
  id: string;
  tableSessionId: string;
  placedAt: string;
  items: BackendItem[];
  tableSession?: { tables: { tableId: string }[] };
};
type ServingTask = {
  id: string;
  orderItemId: string;
  status: string;
  claimedByWaiterId?: string;
  claimedAt?: string;
  availableAt: string;
  orderItem: BackendItem & {
    order: { table?: { code: string; name?: string } };
  };
};
const servingTaskByLine = new Map<string, string>();

const itemStatus = (status: string): BranchOrderLine["status"] =>
  ({
    PENDING: "queued",
    QUEUED: "queued",
    PREPARING: "cooking",
    READY: "awaiting_pickup",
    SERVED: "served",
    OUT_OF_STOCK: "sold_out",
    CANCELLED: "cancelled",
  })[status] as BranchOrderLine["status"];

export async function loginOperational(
  email: string,
  password: string,
): Promise<AuthUser> {
  const response = await apiRequest<any>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  const role = String(response.user.role).toLowerCase();
  if (role !== "waiter" && role !== "kitchen")
    throw new Error(
      "Chỉ Waiter và Kitchen Staff dùng kết nối API ở giai đoạn này",
    );
  saveAccessToken(response.accessToken);
  const employee = response.user.employee;
  return {
    id: response.user.id,
    name: employee
      ? `${employee.firstName} ${employee.lastName}`
      : response.user.email,
    email: response.user.email,
    role,
    tenantId: null,
    branchId: employee?.branchId ?? null,
    mustChangePassword: false,
    apiBacked: true,
  };
}

export async function loadOperationalData(user: AuthUser) {
  if (user.role === "kitchen") {
    const queue = await apiRequest<any>("/kitchen/queue?pageSize=100");
    const menuItems = Array.from(
      new Map(
        queue.data.map((item: any) => [
          item.menuItemId,
          {
            id: item.menuItemId,
            tenantId: "api",
            name: item.itemName,
            category: item.menuItem.category.name,
            price: Number(item.unitPrice),
            activeChain: true,
          },
        ]),
      ).values(),
    ) as MenuItem[];
    return {
      branches: [],
      tables: [],
      sessions: [],
      menuItems,
      branchMenuItems: [],
      orderLines: queue.data.map(mapQueueLine),
      workSessions: activeShift(user),
    };
  }
  const [context, serving] = await Promise.all([
    apiRequest<any>("/waiter/orders/context/current"),
    apiRequest<any>("/waiter/serving-tasks?pageSize=100"),
  ]);
  servingTaskByLine.clear();
  for (const task of serving.data as ServingTask[])
    servingTaskByLine.set(task.orderItemId, task.id);
  const branch: Branch = {
    id: context.branch.id,
    tenantId: context.branch.chainId,
    name: context.branch.name,
    address: "",
    phone: "",
    openTime: "",
    closeTime: "",
    status: "open",
  };
  const tables: FloorTable[] = context.tables.map((t: any) => ({
    id: t.id,
    branchId: context.branch.id,
    area: t.area || `Tầng ${t.floor}`,
    seats: t.capacity,
    status:
      String(t.status).toLowerCase() === "out_of_service"
        ? "locked"
        : String(t.status).toLowerCase(),
    currentSessionId: t.sessionTables[0]?.tableSessionId ?? null,
    adjacentTableIds: t.adjacentFrom.map((a: any) => a.adjacentTableId),
  }));
  const sessions: TableSession[] = context.sessions.map((s: any) => ({
    id: s.id,
    tenantId: context.branch.chainId,
    branchId: context.branch.id,
    tableIds: s.tables.map((t: any) => t.tableId),
    guests: s.guestCount,
    openedBy: user.name,
    openedAt: s.openedAt,
    status: String(s.status).toLowerCase(),
    paidAt: s.paidAt,
    closedAt: s.closedAt,
  }));
  const menuItems: MenuItem[] = context.menuItems.map((entry: any) => ({
    id: entry.menuItem.id,
    tenantId: context.branch.chainId,
    name: entry.menuItem.name,
    description: entry.menuItem.description,
    imageUrl: entry.menuItem.imageUrl,
    category: entry.menuItem.category.name,
    price: Number(entry.menuItem.price),
    activeChain: entry.menuItem.isAvailable,
  }));
  const branchMenuItems: BranchMenuItem[] = context.menuItems.map(
    (entry: any) => ({
      branchId: entry.branchId,
      menuItemId: entry.menuItemId,
      isAvailable: entry.isAvailable && entry.isEnabled,
      remainingToday: entry.remainingPortions,
      soldToday: 0,
    }),
  );
  const orderLines = (context.orders as BackendOrder[]).flatMap((order) =>
    order.items.map((item) => mapOrderLine(item, order, serving.data)),
  );
  return {
    branches: [branch],
    tables,
    sessions,
    menuItems,
    branchMenuItems,
    orderLines,
    workSessions: context.workSessions.length
      ? activeShift(user)
      : activeShift(user),
  };
}

function activeShift(user: AuthUser): WorkSession[] {
  return [
    {
      id: `api-${user.id}`,
      tenantId: user.tenantId ?? "api",
      branchId: user.branchId ?? "",
      staffId: user.id,
      status: "inShift",
      offSchedule: false,
      autoClosed: false,
      checkedInAt: new Date().toISOString(),
    },
  ];
}
function mapOrderLine(
  item: BackendItem,
  order: BackendOrder,
  tasks: ServingTask[],
): BranchOrderLine {
  const task = tasks.find((t) => t.orderItemId === item.id);
  return {
    id: item.id,
    orderId: item.orderId,
    menuItemId: item.menuItemId,
    name: item.itemName,
    unitPrice: Number(item.unitPrice),
    qty: item.quantity,
    note: item.specialInstructions,
    status: itemStatus(item.status),
    claimedBy: task?.status === "CLAIMED" ? task.claimedByWaiterId : undefined,
    claimedAt: task?.claimedAt,
    startedAt: item.startedAt,
    doneAt: item.readyAt,
    sessionId: order.tableSessionId,
    tableIds: order.tableSession?.tables.map((t) => t.tableId) ?? [],
    openedAt: order.placedAt,
    orderCreatedAt: order.placedAt,
  };
}
function mapQueueLine(item: any): BranchOrderLine {
  return {
    id: item.id,
    orderId: item.orderId,
    menuItemId: item.menuItemId,
    name: item.itemName,
    unitPrice: Number(item.unitPrice),
    qty: item.quantity,
    note: item.specialInstructions,
    status: itemStatus(item.status),
    startedAt: item.startedAt,
    sessionId: "",
    tableIds: [item.order.table?.code ?? item.order.tableId],
    openedAt: item.order.placedAt,
    orderCreatedAt: item.order.placedAt,
    category: item.menuItem.category.name,
  } as BranchOrderLine;
}

export async function submitOperationalOrder(
  sessionId: string,
  cart: { menuItemId: string; qty: number; note?: string }[],
): Promise<SubmitOrderResult> {
  const order = await apiRequest<any>("/waiter/orders", {
    method: "POST",
    body: JSON.stringify({ tableSessionId: sessionId }),
  });
  for (const item of cart)
    await apiRequest(`/waiter/orders/${order.id}/items`, {
      method: "POST",
      body: JSON.stringify({
        menuItemId: item.menuItemId,
        quantity: item.qty,
        specialInstructions: item.note,
      }),
    });
  const submitted = await apiRequest<any>(`/waiter/orders/${order.id}/submit`, {
    method: "POST",
  });
  return {
    ok: true,
    order: {
      id: submitted.id,
      tenantId: "api",
      sessionId,
      createdBy: "api",
      createdAt: submitted.placedAt,
    },
    lines: [],
  };
}
export const startOperationalItem = (id: string) =>
  apiRequest(`/kitchen/items/${id}/start`, { method: "POST" });
export const readyOperationalItem = (id: string) =>
  apiRequest(`/kitchen/items/${id}/ready`, { method: "POST" });
export const unavailableOperationalItem = (id: string) =>
  apiRequest(`/kitchen/items/${id}/unavailable`, {
    method: "POST",
    body: JSON.stringify({ reason: "Kitchen reported item unavailable" }),
  });
async function taskId(lineId: string) {
  if (!servingTaskByLine.has(lineId)) {
    const response = await apiRequest<any>(
      "/waiter/serving-tasks?pageSize=100",
    );
    for (const task of response.data)
      servingTaskByLine.set(task.orderItemId, task.id);
  }
  const id = servingTaskByLine.get(lineId);
  if (!id) throw new Error("Không tìm thấy nhiệm vụ bưng món");
  return id;
}
export const claimOperationalLine = async (lineId: string) =>
  apiRequest(`/waiter/serving-tasks/${await taskId(lineId)}/claim`, {
    method: "POST",
  });
export const serveOperationalLine = async (lineId: string) =>
  apiRequest(`/waiter/serving-tasks/${await taskId(lineId)}/serve`, {
    method: "POST",
  });
