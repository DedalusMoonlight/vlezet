import { useEffect, useId, useRef, useState } from "react";

/** Keep the editing text intact; only valid whole numbers reach the model. */
export function IntegerInput({
  label,
  value,
  onChange,
  min = 1,
  max = 100000,
  onValidityChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  onValidityChange?: (valid: boolean) => void;
}) {
  const id = useId();
  const notifyValidity = useRef(onValidityChange);
  notifyValidity.current = onValidityChange;
  const [draft, setDraft] = useState({ text: String(value), source: value });
  const [blurred, setBlurred] = useState(false);
  if (draft.source !== value) setDraft({ text: String(value), source: value });
  const valid =
    /^-?\d+$/.test(draft.text) &&
    Number.isSafeInteger(Number(draft.text)) &&
    Number(draft.text) >= min &&
    Number(draft.text) <= max;
  useEffect(() => {
    notifyValidity.current?.(valid);
  }, [valid, value]);
  return (
    <div className="measure">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        inputMode="numeric"
        value={draft.text}
        required
        aria-invalid={!valid}
        aria-describedby={!valid && blurred ? `${id}-error` : undefined}
        onBlur={() => setBlurred(true)}
        onChange={(event) => {
          const text = event.target.value;
          const number = Number(text);
          const accepted =
            /^-?\d+$/.test(text) &&
            Number.isSafeInteger(number) &&
            number >= min &&
            number <= max;
          setDraft({ text, source: accepted ? number : value });
          onValidityChange?.(accepted);
          if (accepted) onChange(number);
        }}
      />
      {!valid && blurred && (
        <small role="alert" id={`${id}-error`}>
          Введите целое число от {min} до {max}
        </small>
      )}
    </div>
  );
}
