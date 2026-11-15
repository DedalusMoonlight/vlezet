import { useState } from "react";
import vehicles from "../../data/vehicles.json";
import { useProject } from "../project/store";
import { Measure } from "./Measure";
import type { Vehicle } from "@vlezet/domain";
export function VehicleForm() {
  const { input, setInput } = useProject();
  const [preset, setPreset] = useState("");
  const [draft, setDraft] = useState<Vehicle>(input.vehicle);
  const [payload, setPayload] = useState(true);
  const [confirmed, setConfirmed] = useState(true);
  const [error, setError] = useState("");
  const [key, setKey] = useState(0);
  const v = vehicles.find((x) => x.id === preset);
  const dirty =
    JSON.stringify(draft) !== JSON.stringify(input.vehicle) || !confirmed;
  return (
    <section className="card">
      <span className="eyebrow">01 / НА ЧЁМ ЕДЕМ</span>
      <h2>Место для всего</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (
            !payload ||
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
                  lengthMm: p.lengthMm,
                  widthMm: p.widthMm,
                  heightMm: p.heightMm,
                  payloadG: input.vehicle.payloadG,
                });
                setKey((k) => k + 1);
                setConfirmed(false);
                setPayload(false);
              }
            }}
          >
            <option value="">Свои размеры / демонстрационный кузов</option>
            {vehicles.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
        <div className="fields-three" key={key}>
          {(["lengthMm", "widthMm", "heightMm"] as const).map((k, i) => (
            <Measure
              label={["Длина, см", "Ширина, см", "Высота, см"][i]}
              key={k}
              unit="cm"
              value={draft[k]}
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
          value={draft.payloadG}
          onChange={(n) => {
            setDraft((d) => ({ ...d, payloadG: n }));
            setPayload(true);
            setConfirmed(false);
          }}
        />
        {v && (
          <p className="hint">
            {v.note}{" "}
            <a href={v.source} target="_blank" rel="noreferrer">
              Источник производителя
            </a>{" "}
            · проверен {v.checkedAt}. Грузоподъёмность укажите по документам
            своей машины, с учётом людей и оборудования.
          </p>
        )}
        <label className="check">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => {
              setConfirmed(e.target.checked);
              setPayload(e.target.checked);
            }}
          />
          Подтверждаю размеры свободного прямоугольника и доступную
          грузоподъёмность
        </label>
        <p className="hint">
          Замерьте свободный объём и проём. Арки и выступы должны остаться за
          пределами прямоугольника.
        </p>
        {error && <p role="alert">{error}</p>}
        <button type="submit">
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
