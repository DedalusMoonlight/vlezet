import { useEffect, useRef, useState } from "react";
import { randomId } from "@vlezet/domain";
import { useProject } from "./store";
import { usePlayback } from "../instructions/store";
import { useDialogFocus } from "../input/useDialogFocus";
import {
  loadProject,
  saveProjectSwap,
  type ProjectSnapshot,
  type SavedProject,
} from "../../storage/repository";

import { withAutosavePaused } from "../../storage/useAutosave";

export function ProjectActions({
  onChanged,
}: {
  onChanged: (hasPlan: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="new-project" onClick={() => setOpen(true)}>
        Новый расчёт
      </button>
      {open && (
        <ProjectDialog onClose={() => setOpen(false)} onChanged={onChanged} />
      )}
    </>
  );
}

function ProjectDialog({
  onClose,
  onChanged,
}: {
  onClose: () => void;
  onChanged: (hasPlan: boolean) => void;
}) {
  const [previous, setPrevious] = useState<SavedProject | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [error, setError] = useState("");
  const dialogRef = useDialogFocus(() => {
    if (!pending.current) onClose();
  });
  useEffect(() => {
    let alive = true;
    void loadProject("previous")
      .then((saved) => {
        if (alive) {
          setPrevious(saved);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (alive)
          setError(
            "Не удалось открыть сохранённые расчёты. Попробуйте ещё раз; текущие данные не изменены.",
          );
      });
    return () => {
      alive = false;
    };
  }, []);
  const change = async (recover: boolean) => {
    if (pending.current || !loaded || (recover && !previous)) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await withAutosavePaused(async () => {
        const current = useProject.getState();
        const snapshot: ProjectSnapshot = {
          input: current.input,
          solution: current.currentSolution ?? current.staleSolution,
          playback: usePlayback.getState().playback,
          cancelled:
            current.status === "cancelled" || current.status === "running",
        };
        const next: ProjectSnapshot =
          recover && previous
            ? previous
            : {
                input: {
                  ...current.input,
                  revisionId: randomId(),
                  cargoTypes: [],
                  instances: [],
                },
                solution: null,
                playback: null,
                cancelled: false,
              };
        await saveProjectSwap(next, snapshot);
        current.restore(next.input, next.solution, next.cancelled);
        usePlayback.getState().setPlayback(next.playback);
        onChanged(!!next.solution);
      });
      onClose();
    } catch {
      setError(
        "Не удалось сохранить предыдущий расчёт. Текущие данные не изменены. Освободите место или скачайте JSON-копию.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  return (
    <div className="modal-backdrop">
      <section
        className="modal"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Новый расчёт"
      >
        <h2>Новый расчёт</h2>
        <p>
          Очистим список грузов и план. Сохраним применённые размеры машины и
          зазоры; неприменённые правки будут сброшены.
        </p>
        <p className="hint">
          Текущий расчёт сохранится как предыдущий. Его можно вернуть здесь даже
          после закрытия приложения. Хранится один предыдущий расчёт; для архива
          скачайте JSON.
        </p>
        {previous && (
          <div className="previous-project">
            <p>
              Предыдущий расчёт: {previous.input.instances.length} коробок
              {previous.solution ? " · есть план" : ""}.
            </p>
            <button disabled={busy} onClick={() => void change(true)}>
              Вернуть предыдущий расчёт
            </button>
            <p className="hint">
              Текущий и предыдущий расчёты поменяются местами.
            </p>
          </div>
        )}
        {!loaded && !error && (
          <p role="status">Открываем сохранённые расчёты…</p>
        )}
        {error && <p role="alert">{error}</p>}
        <div className="modal-actions">
          <button autoFocus disabled={busy} onClick={onClose}>
            Отмена
          </button>
          <button
            className="primary"
            disabled={busy || !loaded}
            onClick={() => void change(false)}
          >
            {busy ? "Сохраняем…" : "Начать с пустого списка"}
          </button>
        </div>
      </section>
    </div>
  );
}
