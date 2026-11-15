import { useEffect, useState } from "react";
import { useProject } from "../project/store";
import { CargoScene } from "../../scene/CargoScene";
import { freshPlayback, getStepScene, solutionRevision } from "./playback";
import { usePlayback } from "./store";
export function InstructionPlayer() {
  const { input, currentSolution: s } = useProject();
  const { playback, setPlayback } = usePlayback();
  const [t, setT] = useState(0);
  const valid = s?.status === "ready" && s.report?.valid;
  const state =
    s &&
    (playback?.solutionRevisionId === solutionRevision(s)
      ? playback
      : freshPlayback(s));
  const steps =
    (s?.report &&
      (state?.mode === "load" ? s.report.loadSteps : s.report.unloadSteps)) ||
    [];
  useEffect(() => {
    if (!state || state.paused || !valid) return;
    let frame = 0;
    let previous = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(now - previous, 100);
      previous = now;
      setT((v) => Math.min(1, v + (dt * state.speed) / 1800));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [state?.paused, state?.speed, state?.stepIndex, valid]);
  useEffect(() => {
    if (t >= 1 && state && !state.paused)
      setPlayback({ ...state, paused: true });
  }, [t, state?.paused]);
  if (!valid || !s || !state)
    return (
      <p className="warning">
        Инструкция появится после размещения всех обязательных грузов.
      </p>
    );
  const scene = getStepScene(s, state, t);
  const visible = s.placements.filter((p) =>
    scene.staticIds.includes(p.instanceId),
  );
  if (scene.movingId && scene.position) {
    const p = s.placements.find((p) => p.instanceId === scene.movingId)!;
    visible.push({ ...p, position: scene.position });
  }
  const step = steps[state.stepIndex];
  const type = step
    ? input.cargoTypes.find(
        (c) =>
          c.id ===
          input.instances.find((i) => i.id === step.instanceId)!.typeId,
      )
    : null;
  const placement = s.placements.find((p) => p.instanceId === step?.instanceId);
  const jump = (index: number) => {
    setT(0);
    setPlayback({ ...state, stepIndex: index, paused: true });
  };
  return (
    <>
      <div className="actions compact">
        <button
          aria-pressed={state.mode === "load"}
          onClick={() => {
            setT(0);
            setPlayback(freshPlayback(s, "load"));
          }}
        >
          Загрузка
        </button>
        <button
          aria-pressed={state.mode === "unload"}
          onClick={() => {
            setT(0);
            setPlayback(freshPlayback(s, "unload"));
          }}
        >
          Выгрузка
        </button>
      </div>
      <CargoScene
        input={input}
        placements={visible}
        selected={scene.movingId}
      />
      <div className="step-card">
        <span className="eyebrow">
          {state.mode === "load" ? "ЗАГРУЗКА" : "ВЫГРУЗКА"}
        </span>
        <h3>
          {step
            ? `Шаг ${state.stepIndex + 1} из ${steps.length}`
            : "Все шаги пройдены"}
        </h3>
        {step && type && (
          <>
            <strong>{type.name}</strong>
            <p>
              {step.instanceId} · {type.massG / 1000} кг · точка {step.stop}
            </p>
            <p className="hint">
              Снизу грань {placement?.orientation.downFace} · поворот{" "}
              {(placement?.orientation.yawQuarterTurns ?? 0) * 90}°
            </p>
            <label>
              Прогресс шага
              <input
                type="range"
                min={0}
                max={100}
                value={t * 100}
                onChange={(e) => {
                  setPlayback({ ...state, paused: true });
                  setT(Number(e.target.value) / 100);
                }}
              />
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={state.completedIds.includes(step.instanceId)}
                onChange={(e) =>
                  setPlayback({
                    ...state,
                    completedIds: e.target.checked
                      ? [...new Set([...state.completedIds, step.instanceId])]
                      : state.completedIds.filter(
                          (id) => id !== step.instanceId,
                        ),
                  })
                }
              />
              Коробка обработана
            </label>
          </>
        )}
        <div className="actions">
          <button
            disabled={state.stepIndex === 0}
            onClick={() => jump(state.stepIndex - 1)}
          >
            Назад
          </button>
          <button
            className="primary"
            disabled={!step}
            onClick={() => {
              if (t === 1) setT(0);
              setPlayback({ ...state, paused: !state.paused });
            }}
          >
            {state.paused ? "Показать движение" : "Пауза"}
          </button>
          <button disabled={!step} onClick={() => jump(state.stepIndex + 1)}>
            Дальше
          </button>
        </div>
        <div className="fields-two">
          <label>
            Перейти к остановке
            <select
              value={step?.stop ?? ""}
              onChange={(e) =>
                jump(steps.findIndex((s) => s.stop === Number(e.target.value)))
              }
            >
              <option value="" disabled>
                Готово
              </option>
              {[...new Set(steps.map((s) => s.stop))].map((stop) => (
                <option key={stop} value={stop}>
                  Точка {stop}
                </option>
              ))}
            </select>
          </label>
          <label>
            Скорость
            <select
              value={state.speed}
              onChange={(e) =>
                setPlayback({ ...state, speed: Number(e.target.value) })
              }
            >
              {[0.5, 1, 2].map((v) => (
                <option key={v} value={v}>
                  {v}×
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="hint">
          Просмотр анимации не отмечает работу выполненной. Отметки сохраняются
          отдельно.
        </p>
      </div>
    </>
  );
}
