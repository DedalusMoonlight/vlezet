import { useRef, useState } from "react";
import { encodeProject, decodeProject } from "@vlezet/io";
import { useProject } from "../project/store";
import { usePlayback } from "../instructions/store";
import { download } from "../import/download";
export function ExportTools() {
  const { input, currentSolution, restore } = useProject();
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const [includeSteps, setIncludeSteps] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const pdf = async () => {
    if (!currentSolution) return;
    abort.current = new AbortController();
    setProgress("Готовим PDF…");
    setError("");
    try {
      const [{ exportPdf }, { renderFrame }] = await Promise.all([
        import("./pdf"),
        import("./renderFrame"),
      ]);
      const bytes = await exportPdf(
        input,
        currentSolution,
        {
          includeStepImages: includeSteps,
          signal: abort.current.signal,
          onProgress: (i, n) => setProgress(`Кадры: ${i} из ${n}`),
        },
        async (step) => {
          const ids =
            step === null
              ? null
              : new Set(
                  currentSolution
                    .report!.loadSteps.slice(0, step + 1)
                    .map((s) => s.instanceId),
                );
          return renderFrame(
            input,
            currentSolution.placements.filter(
              (p) => !ids || ids.has(p.instanceId),
            ),
          );
        },
      );
      download(bytes, "vlezet-plan.pdf", "application/pdf");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка экспорта");
    } finally {
      setProgress("");
    }
  };
  return (
    <>
      <button
        onClick={() =>
          download(
            encodeProject(input, currentSolution),
            "vlezet-project.json",
            "application/json",
          )
        }
      >
        Скачать JSON
      </button>
      <button onClick={() => file.current?.click()}>Открыть JSON</button>
      <input
        hidden
        ref={file}
        aria-label="Файл проекта JSON"
        type="file"
        accept=".json"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          try {
            if (f.size > 1024 * 1024) throw new Error("JSON больше 1 МиБ");
            const saved = decodeProject(new Uint8Array(await f.arrayBuffer()));
            restore(saved.input, saved.solution);
            usePlayback.getState().setPlayback(null);
            setError("");
          } catch (e) {
            setError(e instanceof Error ? e.message : "Некорректный файл");
          }
          e.target.value = "";
        }}
      />
      <button
        disabled={!currentSolution || !!progress}
        onClick={() => void pdf()}
      >
        Скачать PDF
      </button>
      <label className="check compact-check">
        <input
          type="checkbox"
          checked={includeSteps}
          onChange={(e) => setIncludeSteps(e.target.checked)}
        />
        С кадрами шагов
      </label>
      {progress && (
        <>
          <span role="status">{progress}</span>
          <button onClick={() => abort.current?.abort()}>Отменить PDF</button>
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </>
  );
}
