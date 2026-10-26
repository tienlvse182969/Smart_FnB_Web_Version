import { afterEach, describe, expect, it, vi } from "vitest";
import { accountReal } from "./real";
import { mapManager, mapStaffEmployee } from "./mapper";
const user = { email: "staff@example.com", phone: null, status: "INACTIVE", lastLoginAt: null, role: { code: "CASHIER" } };
afterEach(() => vi.unstubAllGlobals());
describe("Staff invitation API contract", () => {
  for (const role of ["MANAGER", "CASHIER", "BARISTA"] as const) it(`Owner invites ${role} without username/password`, async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ account: { id: "e", branchId: "b", firstName: "An", lastName: "Nguyen", employeeCode: "EMP", user: { ...user, role: { code: role }, staffInvitationState: "PENDING" } }, invitationExpiresAt: "2099-01-01", emailStatus: "PENDING", setupToken: "secret" }), { status: 201 }));
    vi.stubGlobal("fetch", fetcher);
    const result = await accountReal.inviteAccount("chain", { name: "An Nguyen", email: " An@example.com ", role, branchId: "b" });
    expect(String(fetcher.mock.calls[0][0])).toMatch(/\/employees\/invitations$/);
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ name: "An Nguyen", email: "an@example.com", role, branchId: "b" });
    expect(result.expiresAt).toBe("2099-01-01"); expect(result.emailStatus).toBe("PENDING");
    expect(JSON.stringify(result)).not.toContain("secret");
  });
  it("resends pending Owner invitations with reason and surfaces cooldown", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "Wait 60 seconds" }), { status: 429 }));
    vi.stubGlobal("fetch", fetcher);
    await expect(accountReal.resetManagerPassword("e", "Sai hộp thư", true)).rejects.toMatchObject({ status: 429 });
    expect(String(fetcher.mock.calls[0][0])).toMatch(/\/employees\/e\/invitation\/resend$/);
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ reason: "Sai hộp thư" });
  });
  it("rejects missing reason before sending a status request", async () => {
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    await expect(accountReal.setManagerActive("e", false)).rejects.toMatchObject({ status: 400 });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("preserves cancelled state and only the safe invitation expiry fields", () => {
    const base = { id: "e", branchId: "b", employeeCode: "EMP", firstName: "An", lastName: "Nguyen", user };
    expect(mapStaffEmployee({ ...base, invitationStatus: "CANCELLED" })?.invitationStatus).toBe("CANCELLED");
    const manager = mapManager({ ...base, user: { ...user, staffInvitationState: "CANCELLED", passwordSetupTokens: [{ expiresAt: "2099-01-01" }] } });
    expect(manager.invitationState).toBe("CANCELLED");
    expect(manager.invitationExpiresAt).toBe("2099-01-01");
    expect(JSON.stringify(manager)).not.toContain("passwordSetupTokens");
  });
});
