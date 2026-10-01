import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Không bật globals nên Testing Library không tự dọn DOM sau mỗi test.
afterEach(() => cleanup());
