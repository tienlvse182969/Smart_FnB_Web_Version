import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App as AntApp } from "antd";
import { ApiError } from "../../api/http/errors";
import { stationsApi } from "../../api";
import { useAppStore } from "../../store";
import { PairModal } from "./Stations";

vi.mock("../../components/PairingCodeInput", () => ({
  default: ({ value, onChange, disabled }: { value: string; onChange: (c: string) => void; disabled?: boolean }) => (
    <input data-testid="code" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
  ),
}));
vi.stubGlobal(
  "matchMedia",
  (query: string) => ({ matches: false, media: query, onchange: null, addEventListener: () => undefined, removeEventListener: () => undefined, addListener: () => undefined, removeListener: () => undefined, dispatchEvent: () => false }),
);
vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });

const station = { id: "st1", name: "Quầy 1", status: "ACTIVE", devices: [] } as never;
const LOCK_END = Date.parse("2026-11-13T10:05:00.000Z");

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"], now: Date.parse("2026-11-13T10:00:00.000Z") });
  act(() => useAppStore.setState({ currentBranchId: "b1" }));
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const mount = () => render(<AntApp><PairModal target={{ kind: "CUSTOMER_DISPLAY", station }} onClose={() => undefined} onPaired={async () => undefined} /></AntApp>);

describe("PairModal khoá ghép (BR-45)", () => {
  it("BE trả PAIRING_LOCKED: hiện thời gian còn lại, khoá nhập và nút; hết khoá thì mở lại", async () => {
    vi.spyOn(stationsApi, "pairCustomerDisplay").mockRejectedValue(
      new ApiError(429, "Pairing is locked for this station", [], "PAIRING_LOCKED", { code: "PAIRING_LOCKED", lockedUntil: new Date(LOCK_END).toISOString() }),
    );
    mount();
    fireEvent.change(screen.getByTestId("code"), { target: { value: "123456" } });
    fireEvent.click(screen.getByTestId("pair-submit"));
    fireEvent.click(await screen.findByText("Ghép", { selector: "button span, button" }));
    await waitFor(() => expect(screen.getByTestId("pair-locked")).toBeTruthy());
    expect(screen.getByTestId("pair-locked-left").textContent).toBe("5:00");
    expect((screen.getByTestId("pair-submit") as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByTestId("code") as HTMLInputElement).disabled).toBe(true);

    act(() => { vi.advanceTimersByTime(60_000); });
    expect(screen.getByTestId("pair-locked-left").textContent).toBe("4:00");

    act(() => { vi.advanceTimersByTime(240_000); });
    await waitFor(() => expect(screen.queryByTestId("pair-locked")).toBeNull());
    expect((screen.getByTestId("code") as HTMLInputElement).disabled).toBe(false);
  });
});
