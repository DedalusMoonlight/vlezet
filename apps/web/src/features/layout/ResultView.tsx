import { useState } from "react";
import { LayoutView } from "./LayoutView";
import { InstructionPlayer } from "../instructions/InstructionPlayer";
import { useProject } from "../project/store";
export function ResultView() {
  const [mode, setMode] = useState("layout");
  const s = useProject((s) => s.currentSolution);
  return (
    <>
      <div className="result-tabs">
        <button
          aria-pressed={mode === "layout"}
          onClick={() => setMode("layout")}
        >
          Раскладка
        </button>
        <button
          aria-pressed={mode === "instructions"}
          disabled={s?.status !== "ready" || !s.report?.valid}
          onClick={() => setMode("instructions")}
        >
          3D-инструкция
        </button>
      </div>
      {mode === "layout" ? <LayoutView /> : <InstructionPlayer />}
    </>
  );
}
