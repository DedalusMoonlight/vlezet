import { Inflate, zipSync } from "fflate";

// Never pass untrusted ZIP headers to SheetJS: it allocates from local sizes
// and ZIP64 extra fields. Rebuild a stored archive from bounded, verified data.
export function boundedZip(bytes: Uint8Array): Uint8Array {
  if (bytes[0] !== 80 || bytes[1] !== 75) return bytes;
  const d = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const fail = () => {
    throw new Error("Недостоверная структура или размер ZIP");
  };
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (
      d.getUint32(i, true) === 0x06054b50 &&
      i + 22 + d.getUint16(i + 20, true) === bytes.length
    ) {
      end = i;
      break;
    }
  }
  if (end < 0) return fail();
  const entries = d.getUint16(end + 10, true);
  if (
    d.getUint16(end + 4, true) ||
    d.getUint16(end + 6, true) ||
    d.getUint16(end + 8, true) !== entries ||
    entries > 10000
  )
    return fail();
  const central = d.getUint32(end + 16, true);
  if (central + d.getUint32(end + 12, true) !== end) return fail();
  let pos = central,
    total = 0;
  const files: Record<string, Uint8Array> = Object.create(null);
  const decoder = new TextDecoder("utf-8", { fatal: true });
  for (let i = 0; i < entries; i++) {
    if (pos + 46 > end || d.getUint32(pos, true) !== 0x02014b50) return fail();
    const flags = d.getUint16(pos + 8, true),
      method = d.getUint16(pos + 10, true);
    const compressed = d.getUint32(pos + 20, true),
      original = d.getUint32(pos + 24, true);
    const nameLength = d.getUint16(pos + 28, true);
    const next =
      pos +
      46 +
      nameLength +
      d.getUint16(pos + 30, true) +
      d.getUint16(pos + 32, true);
    const offset = d.getUint32(pos + 42, true);
    total += original;
    if (total > 50 * 1024 * 1024)
      throw new Error("Распакованный XLSX превышает 50 МиБ (ZIP)");
    if (
      next > end ||
      flags & 0x2041 ||
      ![0, 8].includes(method) ||
      offset + 30 > central ||
      d.getUint32(offset, true) !== 0x04034b50 ||
      d.getUint16(offset + 6, true) !== flags ||
      d.getUint16(offset + 8, true) !== method
    )
      return fail();
    const localCompressed = d.getUint32(offset + 18, true),
      localOriginal = d.getUint32(offset + 22, true);
    if (
      (localCompressed !== compressed &&
        !(flags & 8 && localCompressed === 0)) ||
      (localOriginal !== original && !(flags & 8 && localOriginal === 0))
    )
      return fail();
    const start =
      offset +
      30 +
      d.getUint16(offset + 26, true) +
      d.getUint16(offset + 28, true);
    if (start + compressed > central) return fail();
    const name = decoder.decode(
      bytes.subarray(pos + 46, pos + 46 + nameLength),
    );
    if (!name || name.includes("\0") || Object.hasOwn(files, name))
      return fail();
    const source = bytes.subarray(start, start + compressed);
    const data = new Uint8Array(original);
    let written = 0;
    if (method === 0) {
      if (compressed !== original) return fail();
      data.set(source);
      written = original;
    } else {
      const inflate = new Inflate((chunk) => {
        if (written + chunk.length > original) return fail();
        data.set(chunk, written);
        written += chunk.length;
      });
      // A small compressed chunk bounds transient inflation even if metadata lies.
      for (let p = 0; p < source.length; p += 1024)
        inflate.push(source.subarray(p, p + 1024), p + 1024 >= source.length);
    }
    if (written !== original) return fail();
    files[name] = data;
    pos = next;
  }
  if (pos !== end) return fail();
  return zipSync(files, { level: 0 });
}
