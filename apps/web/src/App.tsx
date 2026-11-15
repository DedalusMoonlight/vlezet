import {
  useProject,
  startCalculation,
  cancelCalculation,
} from "./features/project/store";
import { ImportWizard } from "./features/import/ImportWizard";
import { VehicleForm } from "./features/input/VehicleForm";
import { CargoList } from "./features/input/CargoList";
import { ResultView } from "./features/layout/ResultView";
import { ExportTools } from "./features/export/ExportTools";
import { useAutosave } from "./storage/useAutosave";
import { PwaStatus } from "./PwaStatus";
import { ShareDialog } from "./features/share/ShareDialog";
export default function App() {
  const s = useProject();
  const saved = useAutosave();
  if (!saved.ready)
    return (
      <main>
        <p role="status">Открываем проект…</p>
      </main>
    );
  const solution = s.currentSolution;
  return (
    <>
      <header className="app-header">
        <a className="brand" href="/">
          Влезет<span>.</span>
          <small>Покажем, как</small>
        </a>
        <span className="header-note">Меньше рейсов. Больше порядка.</span>
        <span className="pill">На вашем устройстве</span>
      </header>
      <main>
        <div className="intro">
          <div>
            <span className="eyebrow">ПЛАНИРОВЩИК ЗАГРУЗКИ</span>
            <h1>
              У каждой коробки
              <br />
              есть своё место.
            </h1>
            <p>
              Задайте груз и остановки. Получите раскладку
              <br className="desktop" /> и понятную инструкцию в 3D.
            </p>
          </div>
          <div className="intro-stat">
            <strong>{s.input.instances.length}</strong>
            <span>коробок в вашем рейсе</span>
          </div>
        </div>
        <div className="save-status" role="status">
          {saved.status}
        </div>
        <PwaStatus />
        <div className="toolbar">
          <ImportWizard />
          <ExportTools />
          <ShareDialog />
        </div>
        <div className="workspace">
          <div className="input-column">
            <VehicleForm key={JSON.stringify(s.input.vehicle)} />
            <CargoList />
          </div>
          <section className="result-column">
            <div className="card result-card">
              <div className="section-head">
                <div>
                  <span className="eyebrow">03 / КАК ВЛОЖИТЬ</span>
                  <h2>План загрузки</h2>
                </div>
                <span className="pill">
                  {new Set(s.input.cargoTypes.map((c) => c.stop)).size}{" "}
                  остановки
                </span>
              </div>
              <ResultView key={s.input.revisionId} />
              <p role="status">
                {s.status === "running"
                  ? "Ищем раскладку…"
                  : s.status === "cancelled"
                    ? "Расчёт отменён"
                    : solution?.status === "ready"
                      ? "План готов"
                      : solution?.status === "proven-infeasible"
                        ? "Обязательный груз не помещается"
                        : solution?.status === "not-found"
                          ? "Вариант не найден"
                          : solution
                            ? "Часть груза не размещена"
                            : "Готово к расчёту"}
              </p>
              {solution && (
                <>
                  <p>
                    Размещено: {solution.metrics.placedCount} из{" "}
                    {s.input.instances.length}
                  </p>
                  {solution.issues.map((e, i) => (
                    <p className="hint" key={i}>
                      {e.message}
                    </p>
                  ))}
                </>
              )}
              {s.staleSolution && !solution && (
                <p className="warning">Данные изменились. Пересчитайте план.</p>
              )}
              {s.error && <p role="alert">{s.error}</p>}
              <div className="actions">
                <button
                  className="primary"
                  onClick={() => startCalculation(s.input)}
                  disabled={s.status === "running" || !s.input.instances.length}
                >
                  Рассчитать загрузку
                </button>
                {s.status === "running" ? (
                  <button onClick={cancelCalculation}>Отменить расчёт</button>
                ) : (
                  <button
                    onClick={() => startCalculation(s.input, 30000)}
                    disabled={!s.input.instances.length}
                  >
                    Улучшить до 30 секунд
                  </button>
                )}
              </div>
              <p className="hint">
                Лучший найденный вариант. Расчёт учитывает остановки, опоры и
                ограничения коробок.
              </p>
            </div>
          </section>
        </div>
        <footer>
          Влезет. Покажем, как <span>Один рейс · один понятный план</span>
        </footer>
      </main>
    </>
  );
}
