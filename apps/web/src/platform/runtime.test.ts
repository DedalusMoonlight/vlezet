import { expect, it, vi } from "vitest";
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: vi.fn(() => true) },
}));
import { nativeApp } from "./runtime";
it("identifies the installed shell independently of browser origin", () => {
  expect(nativeApp()).toBe(true);
});
