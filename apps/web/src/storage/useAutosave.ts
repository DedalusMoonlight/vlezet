import { useEffect, useState } from "react";
import { useProject } from "../features/project/store";
import { usePlayback } from "../features/instructions/store";
import { loadProject, saveProject } from "./repository";
export function useAutosave() {
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("Открываем проект…");
  useEffect(() => {
    let alive = true;
    let stopProject = () => {};
    let stopPlayback = () => {};
    let timer: ReturnType<typeof setTimeout> | undefined;
    let version = 0;
    let chain = Promise.resolve();
    const write = () => {
      const request = ++version;
      setStatus("Сохраняем…");
      clearTimeout(timer);
      timer = setTimeout(() => {
        const s = useProject.getState(),
          p = usePlayback.getState();
        chain = chain
          .catch(() => {})
          .then(() =>
            saveProject(
              s.input,
              s.currentSolution ?? s.staleSolution,
              p.playback,
              s.status === "cancelled",
            ),
          )
          .then(() => {
            if (alive && request === version)
              setStatus("Сохранено на устройстве");
          })
          .catch(() => {
            if (alive) setStatus("Не удалось сохранить. Скачайте JSON-копию.");
          });
      }, 300);
    };
    void loadProject("active")
      .then((saved) => {
        if (!alive) return;
        if (saved) {
          useProject
            .getState()
            .restore(saved.input, saved.solution, saved.cancelled);
          usePlayback.getState().setPlayback(saved.playback);
          setStatus(
            saved.stale
              ? "Ввод восстановлен. Старую раскладку нужно пересчитать."
              : "Сохранено на устройстве",
          );
        } else setStatus("Демонстрационный проект");
      })
      .catch(() => {
        if (alive)
          setStatus("Не удалось открыть хранилище. Импортируйте JSON-копию.");
      })
      .finally(() => {
        if (!alive) return;
        setReady(true);
        stopProject = useProject.subscribe((s, p) => {
          if (
            s.input !== p.input ||
            s.currentSolution !== p.currentSolution ||
            s.staleSolution !== p.staleSolution ||
            (s.status === "cancelled") !== (p.status === "cancelled")
          )
            write();
        });
        stopPlayback = usePlayback.subscribe(write);
      });
    return () => {
      alive = false;
      clearTimeout(timer);
      stopProject();
      stopPlayback();
    };
  }, []);
  return { ready, status };
}
