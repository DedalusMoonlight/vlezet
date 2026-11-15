import { expect, it, vi } from "vitest";
vi.mock("./runtime", () => ({ nativeApp: () => true }));
import { readSnapshot } from "../features/share/client";
it("never treats the bundled localhost as a public snapshot service", async () => {
  const fetch = vi.spyOn(globalThis, "fetch");
  await expect(readSnapshot("a".repeat(32))).rejects.toThrow(
    "Сервис ссылок пока не подключён",
  );
  expect(fetch).not.toHaveBeenCalled();
  fetch.mockRestore();
});
