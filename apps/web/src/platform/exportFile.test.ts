import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ write: vi.fn(), share: vi.fn() }));
vi.mock("@capacitor/filesystem", () => ({
  Filesystem: { writeFile: mocks.write },
  Directory: { Cache: "CACHE" },
}));
vi.mock("@capacitor/share", () => ({ Share: { share: mocks.share } }));
import { exportNativeFile } from "./exportFile";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.write.mockResolvedValue({ uri: "file:///cache/project.json" });
  mocks.share.mockResolvedValue({});
});
it("writes binary data before opening the native share sheet", async () => {
  const bytes = new Uint8Array([0, 255, 128, 10]);
  await exportNativeFile(bytes, "project.json");
  const options = mocks.write.mock.calls[0][0];
  expect(options.directory).toBe("CACHE");
  expect(options.path).toMatch(/^exports\/.+\/project.json$/);
  expect(Buffer.from(options.data, "base64")).toEqual(Buffer.from(bytes));
  expect(mocks.share).toHaveBeenCalledWith(
    expect.objectContaining({ files: ["file:///cache/project.json"] }),
  );
  expect(mocks.write.mock.invocationCallOrder[0]).toBeLessThan(
    mocks.share.mock.invocationCallOrder[0],
  );
});
it("does not open sharing after a failed write and propagates cancellation", async () => {
  mocks.write.mockRejectedValueOnce(new Error("Storage full"));
  await expect(exportNativeFile(new Uint8Array(), "x.pdf")).rejects.toThrow(
    "Storage full",
  );
  expect(mocks.share).not.toHaveBeenCalled();
  mocks.share.mockRejectedValueOnce(new Error("Share canceled"));
  await expect(exportNativeFile(new Uint8Array(), "x.pdf")).rejects.toThrow(
    "Share canceled",
  );
});
