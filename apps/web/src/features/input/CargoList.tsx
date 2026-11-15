import { useState } from "react";
import type { CargoType } from "@vlezet/domain";
import { useProject } from "../project/store";
import { CargoEditor } from "./CargoEditor";
import { replaceCargo, splitRequired } from "./editing";
export function CargoList() {
  const { input, setInput } = useProject();
  const [editing, setEditing] = useState<CargoType | null | undefined>(
    undefined,
  );
  const [error, setError] = useState("");
  const apply = (types: CargoType[]) => {
    setInput(replaceCargo(input, types));
    setError("");
  };
  const attempt = (f: () => void) => {
    try {
      f();
    } catch {
      setError("Предел: 100 типов, 300 коробок, 20 остановок");
    }
  };
  return (
    <section className="card">
      <div className="section-head">
        <div>
          <span className="eyebrow">02 / ЧТО ВЕЗЁМ</span>
          <h2>
            Ваш груз <span className="count">{input.instances.length}</span>
          </h2>
        </div>
        <button onClick={() => setEditing(null)}>＋ Добавить груз</button>
      </div>
      <div className="actions compact">
        <button
          onClick={() =>
            apply(input.cargoTypes.map((c) => ({ ...c, required: true })))
          }
        >
          Все обязательные
        </button>
        <button
          onClick={() =>
            apply(input.cargoTypes.map((c) => ({ ...c, required: false })))
          }
        >
          Все необязательные
        </button>
      </div>
      <div className="cargo-list">
        {input.cargoTypes.map((c, i) => (
          <article className="cargo-row" key={c.id}>
            <label className="check">
              <input
                aria-label={`Обязательный: ${c.name}`}
                type="checkbox"
                checked={c.required}
                onChange={(e) =>
                  apply(
                    input.cargoTypes.map((t) =>
                      t.id === c.id ? { ...t, required: e.target.checked } : t,
                    ),
                  )
                }
              />
              <span
                className="cargo-icon"
                style={{ background: ["#d8ece3", "#f6e3c9", "#e4def1"][i % 3] }}
              >
                ▣
              </span>
            </label>
            <button className="cargo-title" onClick={() => setEditing(c)}>
              <strong>{c.name}</strong>
              <small>
                {c.lengthMm / 10} × {c.widthMm / 10} × {c.heightMm / 10} см ·{" "}
                {c.massG / 1000} кг × {c.quantity}
              </small>
            </button>
            <span className="stop-badge">Точка {c.stop}</span>
            <div className="row-actions">
              <button
                aria-label={`Дублировать ${c.name}`}
                onClick={() =>
                  attempt(() =>
                    apply([
                      ...input.cargoTypes,
                      {
                        ...c,
                        id: crypto.randomUUID(),
                        name: c.name + " (копия)",
                      },
                    ]),
                  )
                }
              >
                ⧉
              </button>
              <button
                aria-label={`Удалить ${c.name}`}
                onClick={() =>
                  apply(input.cargoTypes.filter((t) => t.id !== c.id))
                }
              >
                ×
              </button>
            </div>
            {c.quantity > 1 && (
              <button
                className="split"
                onClick={() =>
                  attempt(() => setInput(splitRequired(input, c.id, 1)))
                }
              >
                1 шт. сделать {c.required ? "необязательной" : "обязательной"}
              </button>
            )}
          </article>
        ))}
      </div>
      {!input.cargoTypes.length && (
        <p className="empty">
          Добавьте первую коробку или импортируйте таблицу.
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      {editing !== undefined && (
        <CargoEditor
          cargo={editing}
          onClose={() => setEditing(undefined)}
          onSave={(c) =>
            apply(
              editing
                ? input.cargoTypes.map((t) => (t.id === c.id ? c : t))
                : [...input.cargoTypes, c],
            )
          }
        />
      )}
    </section>
  );
}
