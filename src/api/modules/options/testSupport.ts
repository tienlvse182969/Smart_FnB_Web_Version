/** Chỉ cho test: dựng một nhóm đầy đủ trên MOCK bằng các thao tác từng dòng (như màn hình làm), trả nhóm đã nạp lại. */
import type { OptionGroup, OptionGroupInput } from "../../../types";
import { optionsMock } from "./mock";

export async function createFullGroup(chainId: string, input: OptionGroupInput): Promise<OptionGroup> {
  const group = await optionsMock.addGroup(chainId, {
    name: input.name,
    code: input.code,
    isRequired: input.isRequired,
    minSelections: input.minSelections,
    maxSelections: input.maxSelections,
  });
  for (const o of input.options) {
    const created = await optionsMock.addOption(chainId, group.id, { name: o.name, code: o.code, priceDelta: o.priceDelta });
    if (o.isDefault) await optionsMock.patchOption(chainId, group.id, created.id, { isDefault: true });
    if (!o.isActive) await optionsMock.patchOption(chainId, group.id, created.id, { isActive: false });
  }
  return (await optionsMock.listGroups(chainId)).find((g) => g.id === group.id)!;
}
