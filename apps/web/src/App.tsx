import {
  useProject,
  startCalculation,
  cancelCalculation,
} from "./features/project/store";
export default function App() {
  const s = useProject();
  return (
    <main>
      <header>
        <h1>
          Влезет<span>.</span>
        </h1>
        <p>Покажем, как</p>
      </header>
      <h2>У каждой коробки — своё место.</h2>
      <p>18 коробок · 3 остановки · одна понятная схема</p>
      <button
        onClick={() => startCalculation(s.input)}
        disabled={s.status === "running"}
      >
        Рассчитать загрузку
      </button>
      <button onClick={cancelCalculation} disabled={s.status !== "running"}>
        Отменить расчёт
      </button>
      <button
        onClick={() => startCalculation(s.input, 30000)}
        disabled={s.status === "running"}
      >
        Улучшить до 30 секунд
      </button>
      <p role="status">
        {s.status === "running"
          ? "Ищем раскладку…"
          : s.currentSolution?.status === "ready"
            ? "План готов"
            : s.status === "cancelled"
              ? "Расчёт отменён"
              : "Готово к расчёту"}
      </p>
      {s.currentSolution && (
        <p>
          Размещено: {s.currentSolution.metrics.placedCount} из{" "}
          {s.input.instances.length}
        </p>
      )}
      {s.error && <p role="alert">{s.error}</p>}
    </main>
  );
}
