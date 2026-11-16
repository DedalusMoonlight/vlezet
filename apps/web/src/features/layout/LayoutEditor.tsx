import { IntegerInput } from "../input/IntegerInput";
import { useState } from "react";
import type { Placement, Vec3Mm } from "@vlezet/domain";
import { faces } from "@vlezet/domain";
import { orientedDimensions } from "@vlezet/validation";
import { restoreSolution } from "@vlezet/io";
import { cargoInstanceNumber } from "../project/cargoLabel";
import { useProject } from "../project/store";
import { CargoScene, stopColors } from "../../scene/CargoScene";
import {
  previewEdit,
  historyPush,
  historyUndo,
  historyRedo,
  type History,
} from "./commands";
export function LayoutEditor() {
  const { input, currentSolution: s, setSolution } = useProject();
  const [editEpoch, setEditEpoch] = useState(0);
  const [invalidPosition, setInvalidPosition] = useState<
    Record<string, boolean>
  >({});
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState<Placement | null>(null);
  const [drag, setDrag] = useState(false);
  const [history, setHistory] = useState<History | null>(null);
  if (!s) return <CargoScene input={input} placements={[]} />;
  const select = (id: string) => {
    setSelected(id);
    setEditEpoch((v) => v + 1);
    setInvalidPosition({});
    setDraft(structuredClone(s.placements.find((p) => p.instanceId === id)!));
  };
  const boxLabel = (id: string) => {
    const instance = input.instances.find((i) => i.id === id)!;
    const cargo = input.cargoTypes.find((c) => c.id === instance.typeId)!;
    const number = cargoInstanceNumber(input, id);
    return `${cargo.name} · №${number}`;
  };
  const active = s.placements.find((p) => p.instanceId === selected);
  const c = active
    ? input.cargoTypes.find(
        (t) => t.id === input.instances.find((i) => i.id === selected)!.typeId,
      )
    : null;
  const changed = draft && JSON.stringify(draft) !== JSON.stringify(active);
  let result = draft
    ? previewEdit(input, s, {
        kind: "move",
        instanceId: draft.instanceId,
        position: draft.position,
      })
    : null;
  if (draft && result?.accepted)
    result = previewEdit(
      input,
      { ...s, placements: result.placements },
      {
        kind: "rotate",
        instanceId: draft.instanceId,
        orientation: draft.orientation,
      },
    );
  const h =
    history?.present === s ? history : { past: [], present: s, future: [] };
  const commit = () => {
    if (!result?.accepted || Object.values(invalidPosition).some(Boolean))
      return;
    const next = restoreSolution(input, {
      ...s,
      placements: result.placements,
    })!;
    setHistory(historyPush(h, next));
    setSolution(next);
  };
  const undo = (redo = false) => {
    const next = redo ? historyRedo(h) : historyUndo(h);
    setHistory(next);
    setSolution(next.present);
    setEditEpoch((v) => v + 1);
    setDraft(
      structuredClone(
        next.present.placements.find((p) => p.instanceId === selected) ?? null,
      ),
    );
    setInvalidPosition({});
  };
  const updatePosition = (position: Vec3Mm) =>
    setDraft((d) => (d ? { ...d, position } : d));
  const replacePosition = (position: Vec3Mm) => {
    setEditEpoch((v) => v + 1);
    updatePosition(position);
  };
  const stops = [...new Set(input.cargoTypes.map((c) => c.stop))].sort(
    (a, b) => a - b,
  );
  const levels = [
    ...new Set([
      0,
      ...s.placements
        .filter((p) => p.instanceId !== selected)
        .map((p) => {
          const t = input.cargoTypes.find(
            (c) =>
              c.id ===
              input.instances.find((i) => i.id === p.instanceId)!.typeId,
          )!;
          return p.position.z + orientedDimensions(t, p.orientation)[2];
        }),
    ]),
  ].sort((a, b) => a - b);
  return (
    <>
      <CargoScene
        input={input}
        placements={s.placements}
        selected={selected}
        onSelect={select}
        drag={drag}
        onDrag={replacePosition}
        preview={changed ? draft! : undefined}
      />
      <div className="legend">
        {stops.map((stop, i) => (
          <span key={stop}>
            <i style={{ background: stopColors[i % stopColors.length] }} />
            Точка {stop}
          </span>
        ))}
      </div>
      <div className="metrics">
        <div>
          <strong>
            {Math.round(
              (s.metrics.placedVolumeMm3 /
                (input.vehicle.lengthMm *
                  input.vehicle.widthMm *
                  input.vehicle.heightMm)) *
                100,
            )}
            %
          </strong>
          <small>объёма кузова</small>
        </div>
        <div>
          <strong>
            {s.metrics.totalMassG / 1000}
            <em> кг</em>
          </strong>
          <small>из {input.vehicle.payloadG / 1000} кг</small>
        </div>
        <div>
          <strong>
            {s.metrics.placedCount}
            <em> / {input.instances.length}</em>
          </strong>
          <small>коробок размещено</small>
        </div>
      </div>
      <label>
        Выбранная коробка
        <select
          value={selected ?? ""}
          onChange={(e) =>
            e.target.value
              ? select(e.target.value)
              : (setSelected(null), setDraft(null))
          }
        >
          <option value="">Выберите в 3D или списке</option>
          {s.placements.map((p) => (
            <option key={p.instanceId} value={p.instanceId}>
              {boxLabel(p.instanceId)}
            </option>
          ))}
        </select>
      </label>
      <div className="actions compact">
        <button disabled={!h.past.length} onClick={() => undo()}>
          Отменить правку
        </button>
        <button disabled={!h.future.length} onClick={() => undo(true)}>
          Повторить правку
        </button>
      </div>
      {draft && c && (
        <div
          className="edit-panel"
          data-unsaved={
            !!changed || Object.values(invalidPosition).some(Boolean)
          }
        >
          <h3>{boxLabel(selected!)}</h3>
          <p className="hint">
            Масса {c.massG / 1000} кг · остановка {c.stop} · сверху{" "}
            {Math.round((s.report?.loads.topLoadG[selected!] ?? 0) / 10) / 100}{" "}
            кг
          </p>
          <label className="check">
            <input
              type="checkbox"
              checked={drag}
              onChange={(e) => setDrag(e.target.checked)}
            />
            Режим перемещения (камера заблокирована)
          </label>
          <div className="fields-three">
            {(["x", "y", "z"] as const).map((axis, i) => (
              <IntegerInput
                key={selected + axis + editEpoch}
                label={["От дверей X, мм", "Слева Y, мм", "От пола Z, мм"][i]}
                value={draft.position[axis]}
                min={-100000}
                max={100000}
                onValidityChange={(valid) =>
                  setInvalidPosition((v) => ({ ...v, [axis]: !valid }))
                }
                onChange={(value) =>
                  updatePosition({ ...draft.position, [axis]: value })
                }
              />
            ))}
          </div>
          <label>
            Уровень опоры
            <select
              value={levels.includes(draft.position.z) ? draft.position.z : ""}
              onChange={(e) =>
                replacePosition({
                  ...draft.position,
                  z: Number(e.target.value),
                })
              }
            >
              <option value="" disabled>
                Своя высота
              </option>
              {levels.map((z) => (
                <option key={z} value={z}>
                  {z} мм
                </option>
              ))}
            </select>
          </label>
          <div className="fields-two">
            <label>
              Грань снизу
              <select
                value={draft.orientation.downFace}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    orientation: {
                      ...draft.orientation,
                      downFace: e.target.value as (typeof faces)[number],
                    },
                  })
                }
              >
                {c.allowedDownFaces.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </label>
            <label>
              Поворот
              <select
                value={draft.orientation.yawQuarterTurns}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    orientation: {
                      ...draft.orientation,
                      yawQuarterTurns: Number(e.target.value) as 0 | 1 | 2 | 3,
                    },
                  })
                }
              >
                {[0, 1, 2, 3].map((v) => (
                  <option key={v} value={v}>
                    {v * 90}°
                  </option>
                ))}
              </select>
            </label>
          </div>
          {changed &&
            result?.report.issues.map((i, n) => (
              <p role="alert" key={n}>
                {i.message}
              </p>
            ))}
          <button
            className="primary"
            disabled={
              !changed ||
              !result?.accepted ||
              Object.values(invalidPosition).some(Boolean)
            }
            onClick={commit}
          >
            Применить позицию
          </button>
        </div>
      )}
      {s.unplacedIds.length > 0 && (
        <details>
          <summary>Не размещено: {s.unplacedIds.length}</summary>
          {s.unplacedIds.map((id) => (
            <p key={id}>{boxLabel(id)}</p>
          ))}
          <p className="hint">
            Поиск не доказывает невозможность размещения. Можно увеличить кузов
            или продолжить расчёт.
          </p>
        </details>
      )}
    </>
  );
}
