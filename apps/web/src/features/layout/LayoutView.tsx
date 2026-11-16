import { useState } from "react";
import { cargoInstanceNumber } from "../project/cargoLabel";
import { useProject } from "../project/store";
import { CargoScene, stopColors } from "../../scene/CargoScene";

export function LayoutView() {
  const { input, currentSolution: s } = useProject();
  const [selected, setSelected] = useState<string | null>(null);
  if (!s) return <CargoScene input={input} placements={[]} />;
  const boxLabel = (id: string) => {
    const instance = input.instances.find((i) => i.id === id)!;
    const cargo = input.cargoTypes.find((c) => c.id === instance.typeId)!;
    return `${cargo.name} · №${cargoInstanceNumber(input, id)}`;
  };
  const stops = [...new Set(input.cargoTypes.map((c) => c.stop))].sort(
    (a, b) => a - b,
  );
  return (
    <>
      <CargoScene
        input={input}
        placements={s.placements}
        selected={selected}
        onSelect={setSelected}
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
