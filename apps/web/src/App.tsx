import { useRef, useState } from "react";
import {
  useProject,
  startCalculation,
  cancelCalculation,
  applyStopSuggestion,
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
  const [vehicleBlocked, setVehicleBlocked] = useState(false);
  const fileMenu = useRef<HTMLDetailsElement>(null);
  const [section, setSection] = useState("vehicle");
  const [appliedOrder, setAppliedOrder] = useState("");
  if (!saved.ready)
    return (
      <main>
        <p role="status">Открываем проект…</p>
      </main>
    );
  const solution = s.currentSolution;
  const calculate = (budget?: number) => {
    setSection("plan");
    if (fileMenu.current) fileMenu.current.open = false;
    setAppliedOrder("");
    startCalculation(s.input, budget);
  };
  const status =
    s.status === "running"
      ? s.checkingStops
        ? "Проверяем другой порядок остановок…"
        : "Ищем раскладку…"
      : s.status === "cancelled"
        ? "Расчёт отменён"
        : solution?.placements.length === s.input.instances.length && solution
          ? "План готов"
          : solution?.status === "proven-infeasible"
            ? "Обязательный груз не помещается"
            : solution?.status === "not-found"
              ? "Вариант не найден"
              : solution
                ? "Часть груза не размещена"
                : "Готово к расчёту";
  return (
    <>
      <header className="app-header">
        <a className="brand" href="/">
          Влезет<span>.</span>
        </a>
        <span className="save-status" role="status">
          {saved.status}
        </span>
        <details className="file-menu" ref={fileMenu}>
          <summary>Файлы и обмен</summary>
          <div className="file-menu-content">
            <ImportWizard
              onImported={() => {
                setSection("cargo");
                if (fileMenu.current) fileMenu.current.open = false;
              }}
            />
            <ExportTools />
            <ShareDialog />
            <PwaStatus saveStatus={saved.status} />
          </div>
        </details>
      </header>
      <main>
        <div className="workspace-heading">
          <h1>План загрузки</h1>
          <span>
            {s.input.instances.length} коробок ·{" "}
            {s.input.cargoTypes.reduce(
              (sum, c) => sum + c.massG * c.quantity,
              0,
            ) / 1000}{" "}
            кг
          </span>
        </div>
        <nav className="section-nav" aria-label="Разделы проекта">
          {[
            ["vehicle", "Машина"],
            ["cargo", "Груз"],
            ["plan", "План"],
          ].map(([id, title]) => (
            <button
              key={id}
              aria-pressed={section === id}
              onClick={() => setSection(id)}
            >
              {title}
            </button>
          ))}
        </nav>
        <div className="calculation-bar">
          <div>
            <p role="status">{status}</p>
            {vehicleBlocked && (
              <p className="draft-notice">
                Примените размеры машины перед расчётом.
              </p>
            )}
          </div>
          {s.status === "running" ? (
            <button onClick={cancelCalculation}>Отменить расчёт</button>
          ) : (
            <button
              className="primary"
              disabled={vehicleBlocked || !s.input.instances.length}
              onClick={() => calculate()}
            >
              Рассчитать загрузку
            </button>
          )}
        </div>
        <div className="workspace">
          <div className="input-column">
            <div
              className="project-section"
              data-section="vehicle"
              data-active={section === "vehicle"}
            >
              <VehicleForm
                key={JSON.stringify(s.input.vehicle)}
                onDirtyChange={setVehicleBlocked}
              />
              <button
                className="section-next"
                onClick={() => setSection("cargo")}
              >
                Перейти к грузу →
              </button>
            </div>
            <div
              className="project-section"
              data-section="cargo"
              data-active={section === "cargo"}
            >
              <CargoList />
            </div>
          </div>
          <section
            className="result-column project-section"
            data-section="plan"
            data-active={section === "plan"}
            aria-label="Результат расчёта"
          >
            <div className="card result-card">
              <ResultView key={s.input.revisionId} />
              {solution && (
                <p className="result-summary">
                  Размещено: {solution.metrics.placedCount} из{" "}
                  {s.input.instances.length}
                </p>
              )}
              {solution?.issues.map((issue, i) => (
                <p className="hint" key={i}>
                  {issue.message}
                </p>
              ))}
              {s.staleSolution && !solution && (
                <p className="warning">Данные изменились. Пересчитайте план.</p>
              )}
              {vehicleBlocked && (
                <p className="warning">
                  Этот план относится к ранее применённым размерам машины.
                </p>
              )}
              {s.error && <p role="alert">{s.error}</p>}
              {s.stopSuggestion &&
                s.status !== "running" &&
                !vehicleBlocked && (
                  <aside
                    className="route-suggestion"
                    aria-label="Другой порядок остановок"
                  >
                    <h3>Весь груз поместится с другим порядком выгрузки</h3>
                    <p>
                      Найден план на {s.input.instances.length} коробок.
                      Посетите точки в таком порядке:
                    </p>
                    <ol>
                      {s.stopSuggestion.stopOrder.map((stop) => (
                        <li key={stop}>
                          <strong>Точка {stop}</strong>
                          <span>
                            {s.input.cargoTypes
                              .filter((c) => c.stop === stop)
                              .map((c) => c.name)
                              .join(", ")}
                          </span>
                        </li>
                      ))}
                    </ol>
                    <p className="hint">
                      Изменится приоритет целых остановок, состав груза
                      сохранится. Расстояние и время поездки не учитываются.
                    </p>
                    <button
                      className="primary"
                      onClick={() => {
                        const order = s.stopSuggestion!.stopOrder.join(" → ");
                        applyStopSuggestion();
                        setAppliedOrder(
                          `Применён порядок исходных точек: ${order}. Номера остановок обновлены по порядку выгрузки.`,
                        );
                      }}
                    >
                      Применить порядок и план
                    </button>
                  </aside>
                )}
              {appliedOrder && solution && (
                <p role="status" className="notice">
                  {appliedOrder}
                </p>
              )}
              {solution && s.status !== "running" && (
                <button
                  className="secondary-action"
                  disabled={vehicleBlocked || !s.input.instances.length}
                  onClick={() => calculate(30000)}
                >
                  Продолжить поиск · до 30 секунд
                </button>
              )}
              <p className="hint result-note">
                Проверьте реальные размеры и крепление груза перед поездкой.
              </p>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
