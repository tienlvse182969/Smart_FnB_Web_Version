/**
 * Context nhỏ để truyền accentColor xuống component mà không cần
 * prop drilling. Dùng cho gradient sider và decoration.
 */
import { createContext, useContext } from "react";

/** Giá trị mặc định khi chưa có Provider — trùng accent nền tảng (chưa custom). */
export const AccentContext = createContext<string>("#71717a");

export const accentColor = AccentContext;

export function useAccentColor() {
  return useContext(AccentContext);
}
