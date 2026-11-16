import { useId, useState } from "react";
import { normalizeMeasure } from "@vlezet/domain";
export function Measure({
  label,
  value,
  onChange,
  unit = "mm",
  zero = false,
  onValidityChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit?: "mm" | "cm" | "m" | "g" | "kg";
  zero?: boolean;
  onValidityChange?: (valid: boolean) => void;
}) {
  const id = useId();
  const divisor = { mm: 1, cm: 10, m: 1000, g: 1, kg: 1000 }[unit];
  const [text, setText] = useState(String(value / divisor));
  const [error, setError] = useState("");
  const [rounded, setRounded] = useState<number | null>(null);
  const accept = (n: number) => {
    if (n < (zero ? 0 : 1)) {
      onValidityChange?.(false);
      setError(zero ? "Не меньше нуля" : "Больше нуля");
      return;
    }
    try {
      onChange(n);
      onValidityChange?.(true);
      setError("");
      setRounded(null);
    } catch {
      onValidityChange?.(false);
      setError("Проверьте значение и пределы проекта");
    }
  };
  return (
    <div className="measure">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        inputMode="decimal"
        value={text}
        aria-invalid={!!error}
        aria-describedby={error ? id + "-error" : undefined}
        onChange={(e) => {
          const t = e.target.value;
          setText(t);
          setRounded(null);
          const n =
            zero && /^0+(?:[.,]0+)?$/.test(t.trim())
              ? { ok: true as const, value: 0 }
              : normalizeMeasure(t, unit);
          if (!n.ok) {
            onValidityChange?.(false);
            setError(n.error);
            setRounded(n.rounded ?? null);
            return;
          }
          accept(n.value);
        }}
      />
      {error && (
        <small id={id + "-error"} role="alert">
          {error}
        </small>
      )}
      {rounded !== null && (
        <button
          type="button"
          disabled={rounded < (zero ? 0 : 1)}
          onClick={() => {
            setText(String(rounded / divisor));
            accept(rounded);
          }}
        >
          Округлить до {rounded / divisor}{" "}
          {{ mm: "мм", cm: "см", m: "м", g: "г", kg: "кг" }[unit]}
        </button>
      )}
    </div>
  );
}
