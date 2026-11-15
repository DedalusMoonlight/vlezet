import { useState } from "react";
import { normalizeMeasure } from "@vlezet/domain";
export function Measure({
  label,
  value,
  onChange,
  unit = "mm",
  zero = false,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit?: "mm" | "cm" | "m" | "g" | "kg";
  zero?: boolean;
}) {
  const divisor = { mm: 1, cm: 10, m: 1000, g: 1, kg: 1000 }[unit];
  const [text, setText] = useState(String(value / divisor));
  const [error, setError] = useState("");
  return (
    <label>
      {label}
      <input
        inputMode="decimal"
        value={text}
        onChange={(e) => {
          const t = e.target.value;
          setText(t);
          const n =
            zero && /^0+(?:[.,]0+)?$/.test(t.trim())
              ? { ok: true as const, value: 0 }
              : normalizeMeasure(t, unit);
          if (!n.ok) {
            setError(n.error);
            return;
          }
          if (n.value < (zero ? 0 : 1)) {
            setError(zero ? "Не меньше нуля" : "Больше нуля");
            return;
          }
          try {
            onChange(n.value);
            setError("");
          } catch {
            setError("Проверьте значение и пределы проекта");
          }
        }}
        aria-invalid={!!error}
      />
      {error && <small role="alert">{error}</small>}
    </label>
  );
}
