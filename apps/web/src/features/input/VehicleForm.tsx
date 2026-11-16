import { useEffect, useState } from "react";
import vehicles from "../../data/vehicles.json";
import { useProject } from "../project/store";
import { Measure } from "./Measure";
import type { Vehicle } from "@vlezet/domain";
export function VehicleForm({
  onDirtyChange,
}: {
  onDirtyChange: (dirty: boolean) => void;
}) {
  const [validity, setValidity] = useState<Record<string, boolean>>({});
  const { input, setInput } = useProject();
  const [preset, setPreset] = useState("");
  const [draft, setDraft] = useState<Vehicle>(input.vehicle);
  const [confirmed, setConfirmed] = useState(true);
  const [error, setError] = useState("");
  const [key, setKey] = useState(0);
  const v = vehicles.find((x) => x.id === preset);
  const complete = Object.values(draft).every(
    (n) => Number.isSafeInteger(n) && n > 0,
  );
  const dirty =
    JSON.stringify(draft) !== JSON.stringify(input.vehicle) ||
    !complete ||
    !confirmed ||
    Object.values(validity).some((valid) => !valid);
  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);
  return (
    <section className="card" data-unsaved={dirty}>
      <h2>Машина</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (
            Object.values(validity).some((valid) => !valid) ||
            !complete ||
            !confirmed ||
            e.currentTarget.querySelector('[aria-invalid="true"]')
          ) {
            setError("Подтвердите размеры и введите грузоподъёмность");
            return;
          }
          try {
            setInput({ ...input, vehicle: draft });
            setError("");
          } catch {
            setError(
              "Проверьте размеры: до 100 м; грузоподъёмность до 100 000 кг",
            );
          }
        }}
      >
        <label>
          Машина
          <select
            value={preset}
            onChange={(e) => {
              setPreset(e.target.value);
              const p = vehicles.find((x) => x.id === e.target.value);
              if (p) {
                setDraft({
                  lengthMm: p.lengthMm ?? 0,
                  widthMm: p.widthMm ?? 0,
                  heightMm: p.heightMm ?? 0,
                  payloadG: 0,
                });
                setKey((k) => k + 1);
                setValidity((v) => ({
                  wallGap: v.wallGap ?? true,
                  horizontalGap: v.horizontalGap ?? true,
                  lengthMm: p.lengthMm !== null,
                  widthMm: p.widthMm !== null,
                  heightMm: p.heightMm !== null,
                  payload: false,
                }));
                setConfirmed(false);
                setError("");
              }
            }}
          >
            <option value="">Свои размеры</option>
            {[...new Set(vehicles.map((x) => x.brand))].map((brand) => (
              <optgroup key={brand} label={brand}>
                {vehicles
                  .filter((x) => x.brand === brand)
                  .map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </label>
        <div className="fields-three" key={key}>
          {(["lengthMm", "widthMm", "heightMm"] as const).map((k, i) => (
            <Measure
              label={["Длина, см", "Ширина, см", "Высота, см"][i]}
              key={k}
              unit="cm"
              value={draft[k] || null}
              onValidityChange={(valid) =>
                setValidity((v) => ({ ...v, [k]: valid }))
              }
              onChange={(n) => {
                setDraft((d) => ({ ...d, [k]: n }));
                setConfirmed(false);
              }}
            />
          ))}
        </div>
        <Measure
          key={"mass" + key}
          label="Доступная грузоподъёмность, кг"
          unit="kg"
          value={draft.payloadG || null}
          onValidityChange={(valid) =>
            setValidity((v) => ({ ...v, payload: valid }))
          }
          onChange={(n) => {
            setDraft((d) => ({ ...d, payloadG: n }));
            setConfirmed(false);
          }}
        />
        {v && (
          <>
            {(v.widthMm === null ||
              v.heightMm === null ||
              v.lengthMm === null) && (
              <p className="hint">
                Не все размеры подтверждены производителем. Заполните пустые
                поля по замерам своей машины.
              </p>
            )}
            <details>
              <summary>Размеры и источник</summary>
              <p className="hint">{v.note}</p>
              <p className="hint">
                <a href={v.source} target="_blank" rel="noreferrer">
                  Источник производителя
                </a>
                {v.additionalSource && (
                  <>
                    {" "}
                    ·{" "}
                    <a
                      href={v.additionalSource}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Дополнительный источник
                    </a>
                  </>
                )}{" "}
                · проверен {v.checkedAt}.
              </p>
            </details>
          </>
        )}
        <p className="hint">
          Доступную массу груза укажите по документам своей машины, с учётом
          людей и оборудования. Каталог не подставляет максимальную массу из
          рекламы.
        </p>
        <label className="check">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => {
              setConfirmed(e.target.checked);
            }}
          />
          Подтверждаю размеры свободного прямоугольника и доступную
          грузоподъёмность
        </label>
        <p className="hint">
          Размеры из каталога — отправная точка для замера. Проверьте свободный
          прямоугольник по всей высоте и задний проём: обшивка, наклон сидений,
          арки и выступы уменьшают место.
        </p>
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={!dirty}>
          {dirty ? "Применить размеры" : "Размеры применены ✓"}
        </button>
      </form>
      <details>
        <summary>Зазоры и точность</summary>
        <div className="fields-two">
          <Measure
            label="До стен и потолка, мм"
            value={input.settings.wallGapMm}
            zero
            onValidityChange={(valid) =>
              setValidity((v) => ({ ...v, wallGap: valid }))
            }
            onChange={(v) =>
              setInput({
                ...input,
                settings: { ...input.settings, wallGapMm: v },
              })
            }
          />
          <Measure
            label="Между коробками, мм"
            value={input.settings.horizontalGapMm}
            zero
            onValidityChange={(valid) =>
              setValidity((v) => ({ ...v, horizontalGap: valid }))
            }
            onChange={(v) =>
              setInput({
                ...input,
                settings: { ...input.settings, horizontalGapMm: v },
              })
            }
          />
        </div>
        <p className="hint">
          Опора — минимум 95%, все углы поддержаны. Допускаются только узкие
          щели до 5 мм. Нагрузка делится по площади контакта; крепление и
          динамика движения не рассчитываются.
        </p>
      </details>
    </section>
  );
}
