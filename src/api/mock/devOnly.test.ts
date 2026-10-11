import { afterEach, describe, expect, it, vi } from "vitest";
import { loadFailure, setMockFailure, mockControl } from "./control";
import { loadScenario, setScenario } from "./scenario";
import { isPayosErrorSimulated, setPayosErrorSimulated } from "../modules/payos/persist";

const SCENARIO_KEY = "fnb.mock.scenario";
const FAILURE_KEY = "fnb.mock.failure";
const PAYOS_KEY = "smartfnb:mock:payos-error";

afterEach(() => {
  vi.unstubAllEnvs();
  setScenario({ profile: "A", tier: null, expired: false }); // trước khi xoá khoá (ở DEV nó ghi lại storage)
  mockControl.failure = null;
  localStorage.removeItem(SCENARIO_KEY);
  localStorage.removeItem(FAILURE_KEY);
  localStorage.removeItem(PAYOS_KEY);
});

describe("kịch bản mock chỉ ở chế độ dev (quyết định 47)", () => {
  const seed = () => {
    localStorage.setItem(SCENARIO_KEY, JSON.stringify({ profile: "B", tier: "BASIC", expired: true }));
    localStorage.setItem(FAILURE_KEY, JSON.stringify({ kind: "server", rate: 1 }));
    localStorage.setItem(PAYOS_KEY, "1");
  };

  it("DEV = false (production): khoá trong storage KHÔNG đổi tier, hết hạn, lỗi giả, cờ PayOS Lỗi", () => {
    vi.stubEnv("DEV", false);
    seed();
    expect(loadScenario()).toEqual({ profile: "A", tier: null, expired: false });
    expect(loadFailure()).toBeNull();
    expect(isPayosErrorSimulated()).toBe(false);
  });

  it("DEV = false: ghi không chạm storage (setScenario, setMockFailure, setPayosErrorSimulated)", () => {
    vi.stubEnv("DEV", false);
    setScenario({ tier: "ADVANCED", expired: true });
    setMockFailure({ kind: "network", rate: 1 });
    setPayosErrorSimulated(true);
    expect(localStorage.getItem(SCENARIO_KEY)).toBeNull();
    expect(localStorage.getItem(FAILURE_KEY)).toBeNull();
    expect(localStorage.getItem(PAYOS_KEY)).toBeNull();
  });

  it("DEV = true: vẫn đọc và ghi như cũ", () => {
    vi.stubEnv("DEV", true);
    seed();
    expect(loadScenario()).toMatchObject({ profile: "B", tier: "BASIC", expired: true });
    expect(loadFailure()).toEqual({ kind: "server", rate: 1 });
    expect(isPayosErrorSimulated()).toBe(true);
    setScenario({ tier: "ADVANCED" });
    expect(JSON.parse(localStorage.getItem(SCENARIO_KEY) ?? "{}").tier).toBe("ADVANCED");
  });
});
