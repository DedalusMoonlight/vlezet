import { useEffect, useState } from "react";
import { readSnapshot, type SharedSnapshot } from "./client";
import { useProject } from "../project/store";
import { CargoScene } from "../../scene/CargoScene";
import { InstructionPlayer } from "../instructions/InstructionPlayer";
import { saveProject } from "../../storage/repository";
export default function SharedProject() {
  const [data, setData] = useState<SharedSnapshot | null>(null);
  const [error, setError] = useState("");
  const [instructions, setInstructions] = useState(false);
  useEffect(() => {
    let alive = true;
    const token = location.pathname.split("/")[2];
    void readSnapshot(token)
      .then((s) => {
        if (alive) {
          setData(s);
          useProject.getState().restore(s.input, s.solution);
        }
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, []);
  const copy = async () => {
    if (!data) return;
    try {
      await saveProject(data.input, data.solution, null);
      location.assign("/");
    } catch {
      setError("Не удалось сохранить копию на устройстве");
    }
  };
  return (
    <main className="shared-view">
      <a className="brand" href="/">
        Влезет<span>.</span>
      </a>
      <h1>План, которым поделились</h1>
      <p>Неизменяемый снимок. Доступ по ссылке — до 30 дней после создания.</p>
      {error && <p role="alert">{error}</p>}
      {!data && !error && <p role="status">Открываем и проверяем раскладку…</p>}
      {data && (
        <section className="card">
          <p>
            Размещено {data.solution.placements.length} коробок ·{" "}
            {data.solution.metrics.totalMassG / 1000} кг
          </p>
          <div className="actions">
            <button onClick={() => setInstructions(!instructions)}>
              {instructions ? "Раскладка" : "3D-инструкция"}
            </button>
            <button className="primary" onClick={() => void copy()}>
              Скопировать в мой проект
            </button>
          </div>
          <p className="hint">
            Копирование заменит текущий проект на этом устройстве. Сначала
            сохраните его JSON-копию, если он нужен.
          </p>
          {instructions ? (
            <InstructionPlayer />
          ) : (
            <CargoScene
              input={data.input}
              placements={data.solution.placements}
            />
          )}
        </section>
      )}
    </main>
  );
}
