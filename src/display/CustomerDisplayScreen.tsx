import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import type { Socket } from "socket.io-client";
import {
  connectCustomerDisplay,
  createCustomerDisplayPairing,
  DisplayApiError,
  getCustomerDisplayContext,
  resolveDisplayAsset,
  type CustomerDisplayContext,
  type CustomerDisplaySnapshot,
  type PairingRequest,
} from "../api/modules/customerDisplay";

const STORAGE_KEY = "smartfnb.customerDisplay";
const emptySnapshot: CustomerDisplaySnapshot = { state: "IDLE", items: [], totalAmount: 0 };

function loadPairing(): PairingRequest | null {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as PairingRequest | null;
    return value?.deviceToken ? value : null;
  } catch {
    return null;
  }
}

function savePairing(value: PairingRequest | null) {
  if (value) localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  else localStorage.removeItem(STORAGE_KEY);
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency }).format(value);
}

export default function CustomerDisplayScreen() {
  const [pairing, setPairing] = useState<PairingRequest | null>(() => loadPairing());
  const [context, setContext] = useState<CustomerDisplayContext | null>(null);
  const [snapshot, setSnapshot] = useState<CustomerDisplaySnapshot>(emptySnapshot);
  const [version, setVersion] = useState(0);
  const [online, setOnline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const creating = useRef(false);
  const socket = useRef<Socket | null>(null);

  const createCode = useCallback(async () => {
    if (creating.current) return;
    creating.current = true;
    setError(null);
    try {
      const next = await createCustomerDisplayPairing();
      savePairing(next);
      setPairing(next);
      setContext(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể tạo mã ghép nối");
    } finally {
      creating.current = false;
    }
  }, []);

  useEffect(() => {
    if (!pairing) void createCode();
  }, [createCode, pairing]);

  useEffect(() => {
    if (!pairing || context) return;
    let active = true;
    const check = async () => {
      try {
        const result = await getCustomerDisplayContext(pairing.deviceToken);
        if (!active) return;
        setContext(result);
        setSnapshot(result.snapshot ?? emptySnapshot);
        setVersion(result.version);
        setError(null);
      } catch (reason) {
        if (!active) return;
        const expired = Date.parse(pairing.expiresAt) <= Date.now();
        if (reason instanceof DisplayApiError && reason.status === 403 && expired) {
          savePairing(null);
          setPairing(null);
        } else if (!(reason instanceof DisplayApiError) || reason.status !== 403) {
          setError(reason instanceof Error ? reason.message : "Không thể kiểm tra ghép nối");
        }
      }
    };
    void check();
    const timer = window.setInterval(() => void check(), 2_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [context, pairing]);

  useEffect(() => {
    if (!pairing || !context) return;
    socket.current?.disconnect();
    const activeSocket = connectCustomerDisplay(
      pairing.deviceToken,
      (data) => {
        if (data.stationId !== context.station.id) return;
        setVersion((current) => {
          if (data.version <= current) return current;
          setSnapshot(data);
          return data.version;
        });
      },
      () => {
        setOnline(false);
        savePairing(null);
        setPairing(null);
        setContext(null);
      },
    );
    activeSocket.on("connect", () => setOnline(true));
    activeSocket.on("disconnect", () => setOnline(false));
    socket.current = activeSocket;
    return () => {
      activeSocket.disconnect();
      socket.current = null;
    };
  }, [context, pairing]);

  if (!context) {
    return (
      <main className="customer-display pairing-display">
        <div className="pairing-card">
          <div className="eyebrow">MÀN HÌNH KHÁCH HÀNG</div>
          <h1>Ghép màn hình với quầy</h1>
          <p>Nhập mã này trên màn hình quản lý quầy.</p>
          <div className="pairing-code">{pairing?.code ?? "------"}</div>
          <p className="pairing-hint">Mã có hiệu lực trong 5 phút</p>
          {error ? <div className="display-error">{error}</div> : null}
          {error ? <button onClick={() => void createCode()}>Thử lại</button> : null}
        </div>
      </main>
    );
  }

  const { branding, branch, station, currency } = context;
  const isPaid = snapshot.state === "PAID";
  const showQr = snapshot.state === "PAYMENT_QR" && snapshot.qrCode;
  return (
    <main
      className="customer-display"
      style={{ "--display-primary": branding.primaryColor, "--display-accent": branding.accentColor } as CSSProperties}
    >
      <header className="display-header">
        <div className="display-brand">
          {branding.logoUrl ? <img src={resolveDisplayAsset(branding.logoUrl) ?? ""} alt="" /> : null}
          <div><strong>{branding.displayName}</strong><span>{branch.name}</span></div>
        </div>
        <div className={`display-status ${online ? "online" : "offline"}`}>
          {online ? <Wifi size={18} /> : <WifiOff size={18} />}{station.name}
        </div>
      </header>

      {isPaid ? (
        <section className="paid-state">
          <div className="paid-check">✓</div>
          <h1>Thanh toán thành công</h1>
          <p>Số gọi của bạn</p>
          <div className="call-number">{String(snapshot.callNumber ?? 0).padStart(3, "0")}</div>
          <span>Vui lòng giữ hóa đơn và chờ nhận món.</span>
        </section>
      ) : snapshot.state === "IDLE" || snapshot.items.length === 0 ? (
        <section className="idle-state"><h1>Xin chào!</h1><p>Món bạn chọn sẽ hiện ở đây.</p></section>
      ) : (
        <section className="display-order">
          <div className="order-lines">
            <div className="order-title"><h1>Đơn của bạn</h1>{snapshot.orderCode ? <span>#{snapshot.orderCode}</span> : null}</div>
            {snapshot.items.map((item) => (
              <article className="display-line" key={item.key}>
                <div className="line-qty">{item.quantity}</div>
                <div className="line-detail"><strong>{item.name}</strong>{item.options.length ? <span>{item.options.join(" · ")}</span> : null}{item.note ? <em>{item.note}</em> : null}</div>
                <div className="line-price">{formatMoney(item.lineTotal, currency)}</div>
              </article>
            ))}
          </div>
          <aside className="payment-panel">
            <span>Tổng thanh toán</span>
            <strong>{formatMoney(snapshot.totalAmount, currency)}</strong>
            {showQr ? <><div className="qr-value"><QRCodeSVG value={snapshot.qrCode!} size={260} level="M" /></div><h2>Quét mã để thanh toán</h2></> : null}
            {snapshot.state === "PAYMENT_PENDING" ? <h2>Vui lòng thanh toán</h2> : null}
            {snapshot.state === "CART" ? <p>Vui lòng kiểm tra món trước khi thanh toán.</p> : null}
          </aside>
        </section>
      )}
    </main>
  );
}
