import { nativeApp } from "../../platform/runtime";
export async function download(
  bytes: Uint8Array,
  name: string,
  type = "application/octet-stream",
) {
  if (nativeApp()) {
    const { exportNativeFile } = await import("../../platform/exportFile");
    await exportNativeFile(bytes, name);
    return;
  }
  const url = URL.createObjectURL(
    new Blob([bytes.slice().buffer as ArrayBuffer], { type }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
