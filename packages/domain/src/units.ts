import type { ParseResult } from "./types";
export function normalizeMeasure(
  text: string,
  unit: "mm" | "cm" | "m" | "kg" | "g",
): ParseResult {
  const s = text.trim().replace(",", ".");
  if (!/^\d+(?:\.\d+)?$/.test(s))
    return { ok: false, error: "Введите положительное число" };
  const n = Number(s) * { mm: 1, cm: 10, m: 1000, kg: 1000, g: 1 }[unit];
  if (!Number.isFinite(n) || n <= 0)
    return { ok: false, error: "Введите положительное число" };
  const rounded = Math.round(n);
  if (Math.abs(n - rounded) > 1e-7)
    return {
      ok: false,
      error: "Точность — 1 мм или 1 г. Подтвердите округление.",
      rounded,
    };
  return { ok: true, value: rounded };
}
