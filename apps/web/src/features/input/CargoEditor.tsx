import { useState } from "react";
import { cargoSchema, faces, type CargoType } from "@vlezet/domain";
import { Measure } from "./Measure";
import { FaceSelector } from "./FaceSelector";
export function CargoEditor({
  cargo,
  onSave,
  onClose,
}: {
  cargo: CargoType | null;
  onSave: (c: CargoType) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<CargoType>(
    cargo ?? {
      id: crypto.randomUUID(),
      name: "Новая коробка",
      lengthMm: 400,
      widthMm: 300,
      heightMm: 300,
      massG: 10000,
      quantity: 1,
      stop: 1,
      required: true,
      allowedDownFaces: [...faces],
      maxTopLoadG: null,
    },
  );
  const [unit, setUnit] = useState<"mm" | "cm" | "m">("cm");
  const [error, setError] = useState("");
  const patch = (p: Partial<CargoType>) => setDraft((d) => ({ ...d, ...p }));
  return (
    <div className="modal-backdrop">
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Редактор груза"
      >
        <div className="section-head">
          <h2>{cargo ? "Изменить груз" : "Добавить груз"}</h2>
          <button onClick={onClose} aria-label="Закрыть редактор">
            ×
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (e.currentTarget.querySelector('[aria-invalid="true"]')) {
              setError("Исправьте выделенные значения");
              return;
            }
            try {
              onSave(cargoSchema.parse(draft));
              onClose();
            } catch {
              setError(
                "Проверьте данные: до 100 типов, 300 коробок и 20 остановок.",
              );
            }
          }}
        >
          <label>
            Название
            <input
              required
              maxLength={120}
              value={draft.name}
              onChange={(e) => patch({ name: e.target.value })}
            />
          </label>
          <label>
            Единицы размеров
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as typeof unit)}
            >
              <option value="mm">мм</option>
              <option value="cm">см</option>
              <option value="m">м</option>
            </select>
          </label>
          <div className="fields-three">
            {(["lengthMm", "widthMm", "heightMm"] as const).map((k, i) => (
              <Measure
                key={k + unit}
                label={
                  ["Длина", "Ширина", "Высота"][i] +
                  ", " +
                  { mm: "мм", cm: "см", m: "м" }[unit]
                }
                value={draft[k]}
                unit={unit}
                onChange={(v) => patch({ [k]: v })}
              />
            ))}
          </div>
          <div className="fields-three">
            <Measure
              label="Масса одной, кг"
              unit="kg"
              value={draft.massG}
              onChange={(v) => patch({ massG: v })}
            />
            <label>
              Количество
              <input
                type="number"
                min={1}
                max={300}
                required
                value={draft.quantity}
                onChange={(e) => patch({ quantity: Number(e.target.value) })}
              />
            </label>
            <label>
              Остановка
              <input
                type="number"
                min={1}
                max={100000}
                required
                value={draft.stop}
                onChange={(e) => patch({ stop: Number(e.target.value) })}
              />
            </label>
          </div>
          <label className="check">
            <input
              type="checkbox"
              checked={draft.required}
              onChange={(e) => patch({ required: e.target.checked })}
            />
            Обязательный груз
          </label>
          <FaceSelector
            value={draft.allowedDownFaces}
            onChange={(f) => patch({ allowedDownFaces: f })}
          />
          <label className="check">
            <input
              type="checkbox"
              checked={draft.maxTopLoadG !== null}
              onChange={(e) =>
                patch({ maxTopLoadG: e.target.checked ? 0 : null })
              }
            />
            Ограничить массу сверху
          </label>
          {draft.maxTopLoadG !== null && (
            <Measure
              label="Максимальная масса сверху, кг (0 — ничего)"
              value={draft.maxTopLoadG}
              unit="kg"
              zero
              onChange={(v) => patch({ maxTopLoadG: v })}
            />
          )}
          <p className="hint">
            Без ограничения — не проверяем прочность упаковки.
          </p>
          {error && <p role="alert">{error}</p>}
          <div className="actions">
            <button type="button" onClick={onClose}>
              Отмена
            </button>
            <button className="primary" type="submit">
              Сохранить груз
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
