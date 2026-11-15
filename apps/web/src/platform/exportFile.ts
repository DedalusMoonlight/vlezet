import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { randomId } from "@vlezet/domain";
export async function exportNativeFile(
  bytes: Uint8Array,
  name: string,
): Promise<void> {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 32768)
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
  const safeName = name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const file = await Filesystem.writeFile({
    path: `exports/${randomId()}/${safeName}`,
    data: btoa(binary),
    directory: Directory.Cache,
    recursive: true,
  });
  // Keep the unique file in the OS-managed cache while the receiving app reads it.
  await Share.share({
    title: name,
    files: [file.uri],
    dialogTitle: "Сохранить или отправить",
  });
}
