// Chỉ bật MỘT luật: cấm mã màu cứng ngoài src/theme/ (đặc tả v9 mục 10.5 — "frontend không viết
// mã màu cứng ở bất kỳ đâu"). Chưa bật bộ recommended. Mọi màu đi qua token trong src/theme/tokens.ts.
import tseslint from "typescript-eslint";

const NAMED_COLORS = [
  "white", "black", "red", "green", "blue", "yellow", "orange", "purple", "pink", "gray", "grey",
  "brown", "cyan", "magenta", "teal", "navy", "maroon", "olive", "lime", "silver", "gold", "indigo",
  "violet", "crimson", "coral", "salmon", "tomato", "aqua", "fuchsia", "beige", "ivory",
].join("|");

const COLOR_PROPS = [
  "color", "background", "backgroundColor", "borderColor", "borderTopColor", "borderRightColor",
  "borderBottomColor", "borderLeftColor", "outlineColor", "fill", "stroke", "caretColor",
  "textDecorationColor", "accentColor",
].join("|");

const MSG =
  "Không viết mã màu cứng ở đây. Dùng token từ src/theme (palette, useBrand, STATUS_COLORS…); chỉ src/theme/ được định nghĩa màu.";

const restrict = (selector) => ({ selector, message: MSG });

export default [
  { ignores: ["dist/**", "node_modules/**", "src/imports/**", ".figma/**"] },
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/theme/**"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      "no-restricted-syntax": [
        "error",
        // "#fff", "#0a0a0a"…
        restrict("Literal[value=/^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/]"),
        // "2px solid #fff"
        restrict("Literal[value=/(^|[\\s:(,])#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-zA-Z_-])/]"),
        // rgb(), rgba(), hsl(), hsla()… trong chuỗi thường lẫn template
        restrict("Literal[value=/(^|[^a-zA-Z])(rgba?|hsla?|hwb|oklch|oklab|lab|lch)\\(/i]"),
        restrict("TemplateElement[value.raw=/(^|[^a-zA-Z])(rgba?|hsla?|hwb|oklch|oklab)\\(/i]"),
        restrict("TemplateElement[value.raw=/(^|[\\s:(,])#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-zA-Z_-])/]"),
        // tên màu trong object style: { color: "white" }
        restrict(`Property[key.name=/^(${COLOR_PROPS})$/] > Literal[value=/^(${NAMED_COLORS})$/i]`),
        // <svg fill="white" /> và thuộc tính tương tự
        restrict(`JSXAttribute[name.name=/^(fill|stroke)$/] > Literal[value=/^(${NAMED_COLORS})$/i]`),
      ],
    },
  },
];
