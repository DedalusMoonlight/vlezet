import { useEffect, useRef, useState } from "react";
import {
  commitImport,
  mapCargo,
  templateXlsx,
  type TablePreview,
  type ColumnMapping,
  type ImportUnits,
} from "@vlezet/io";
import { useProject } from "../project/store";
import { download } from "./download";
const fields = [
  ["name", "Название"],
  ["lengthMm", "Длина"],
  ["widthMm", "Ширина"],
  ["heightMm", "Высота"],
  ["massG", "Масса"],
  ["quantity", "Количество"],
  ["stop", "Остановка"],
  ["required", "Обязательный"],
  ["allowedDownFaces", "Грани"],
  ["maxTopLoadG", "Масса сверху"],
] as const;
export function ImportWizard() {
  const { input, setInput } = useProject();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<TablePreview | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [units, setUnits] = useState<ImportUnits>({
    dimensions: "cm",
    mass: "kg",
  });
  const [options, setOptions] = useState({
    sheet: "",
    headerRow: 1,
    encoding: "utf-8",
    delimiter: "",
  });
  const [mode, setMode] = useState<"append" | "replace">("append");
  const [skip, setSkip] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const worker = useRef<Worker | null>(null);
  const generation = useRef(0);
  useEffect(
    () => () => {
      worker.current?.terminate();
      generation.current++;
    },
    [],
  );
  const cancel = () => {
    generation.current++;
    worker.current?.terminate();
    setBusy(false);
  };
  const read = async (f: File, opts = options) => {
    cancel();
    setFile(f);
    setPreview(null);
    setError("");
    if (f.size > 10 * 1024 * 1024) {
      setError("Файл больше 10 МиБ");
      return;
    }
    setBusy(true);
    const id = ++generation.current;
    const bytes = await f.arrayBuffer();
    if (id !== generation.current) return;
    const w = new Worker(
      new URL("../../workers/import.worker.ts", import.meta.url),
      { type: "module" },
    );
    worker.current = w;
    const timer = setTimeout(() => {
      if (id === generation.current) {
        w.terminate();
        setBusy(false);
        setError("Разбор занял больше 10 секунд. Разделите файл.");
      }
    }, 10000);
    w.onmessage = (e) => {
      clearTimeout(timer);
      if (id !== generation.current) return;
      setBusy(false);
      w.terminate();
      if (e.data.error) {
        setError(e.data.error);
        return;
      }
      const p = e.data.preview as TablePreview;
      setPreview(p);
      const map: ColumnMapping = {};
      fields.forEach(([key, label]) => {
        const index = p.columns.findIndex(
          (c) =>
            c.toLowerCase() === label.toLowerCase() ||
            c.toLowerCase() === key.toLowerCase(),
        );
        if (index >= 0) map[key] = index;
      });
      setMapping(map);
    };
    w.onerror = () => {
      clearTimeout(timer);
      if (id === generation.current) {
        setBusy(false);
        setError("Не удалось разобрать файл");
      }
    };
    w.postMessage(
      {
        id,
        bytes,
        options: {
          ...opts,
          sheet: opts.sheet || undefined,
          delimiter: opts.delimiter || undefined,
        },
      },
      [bytes],
    );
  };
  const draft = preview ? mapCargo(preview, mapping, units) : null;
  return (
    <>
      <button onClick={() => setOpen(true)}>Импорт Excel / CSV</button>
      {open && (
        <div className="modal-backdrop">
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Импорт таблицы"
            className="modal wide"
          >
            <div className="section-head">
              <h2>Груз из таблицы</h2>
              <button
                aria-label="Закрыть импорт"
                onClick={() => {
                  cancel();
                  setOpen(false);
                }}
              >
                ×
              </button>
            </div>
            <p className="hint">
              XLSX, XLS или CSV · до 10 МиБ · 100 типов и 300 коробок
            </p>
            <label>
              Файл таблицы
              <input
                type="file"
                accept=".xlsx,.xls,.csv,.tsv"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void read(f, { ...options, sheet: "" });
                }}
              />
            </label>
            <button
              onClick={() =>
                void download(
                  templateXlsx(),
                  "vlezet-template.xlsx",
                  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                ).catch((e) =>
                  setError(e instanceof Error ? e.message : "Ошибка экспорта"),
                )
              }
            >
              Скачать шаблон XLSX
            </button>
            <div className="fields-three">
              <label>
                Заголовок в строке
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={options.headerRow}
                  onChange={(e) =>
                    setOptions({
                      ...options,
                      headerRow: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label>
                Кодировка CSV
                <select
                  value={options.encoding}
                  onChange={(e) =>
                    setOptions({ ...options, encoding: e.target.value })
                  }
                >
                  <option value="utf-8">UTF-8</option>
                  <option value="windows-1251">Windows-1251</option>
                </select>
              </label>
              <label>
                Разделитель CSV
                <select
                  value={options.delimiter}
                  onChange={(e) =>
                    setOptions({ ...options, delimiter: e.target.value })
                  }
                >
                  <option value="">Авто</option>
                  <option value=";">;</option>
                  <option value=",">,</option>
                  <option value={"\t"}>Табуляция</option>
                </select>
              </label>
            </div>
            {preview && (
              <label>
                Лист
                <select
                  value={preview.sheet}
                  onChange={(e) => {
                    const opts = { ...options, sheet: e.target.value };
                    setOptions(opts);
                    if (file) void read(file, opts);
                  }}
                >
                  {preview.sheets.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
            )}
            <button
              disabled={!file || busy}
              onClick={() => file && void read(file)}
            >
              Перечитать с этими настройками
            </button>
            {busy && (
              <>
                <p role="status">Читаем таблицу…</p>
                <button onClick={cancel}>Отменить импорт</button>
              </>
            )}
            {preview && (
              <>
                <h3>Сопоставьте колонки</h3>
                <div className="fields-two">
                  {fields.map(([key, label]) => (
                    <label key={key}>
                      {label}
                      <select
                        value={mapping[key] ?? ""}
                        onChange={(e) =>
                          setMapping({
                            ...mapping,
                            [key]:
                              e.target.value === ""
                                ? undefined
                                : Number(e.target.value),
                          })
                        }
                      >
                        <option value="">Не задано</option>
                        {preview.columns.map((c, i) => (
                          <option key={i} value={i}>
                            {i + 1}. {c}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
                <div className="fields-two">
                  <label>
                    Единицы размеров
                    <select
                      value={units.dimensions}
                      onChange={(e) =>
                        setUnits({
                          ...units,
                          dimensions: e.target
                            .value as ImportUnits["dimensions"],
                        })
                      }
                    >
                      <option value="mm">мм</option>
                      <option value="cm">см</option>
                      <option value="m">м</option>
                    </select>
                  </label>
                  <label>
                    Единицы массы
                    <select
                      value={units.mass}
                      onChange={(e) =>
                        setUnits({
                          ...units,
                          mass: e.target.value as ImportUnits["mass"],
                        })
                      }
                    >
                      <option value="kg">кг</option>
                      <option value="g">г</option>
                    </select>
                  </label>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        {preview.columns.map((c, i) => (
                          <th key={i}>{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.slice(0, 10).map((r, i) => (
                        <tr key={i}>
                          {r.map((v, j) => (
                            <td key={j}>{String(v).slice(0, 80)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p>
                  Корректных строк: {draft?.cargo.length} из{" "}
                  {preview.rows.length}
                </p>
                {draft?.issues.slice(0, 30).map((i, k) => (
                  <p className="hint error" key={k}>
                    {i.sheet}, строка {i.row},{" "}
                    {fields.find((f) => f[0] === i.field)?.[1] ?? i.field}:{" "}
                    {i.message}
                  </p>
                ))}
                {!!draft?.issues.length && (
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={skip}
                      onChange={(e) => setSkip(e.target.checked)}
                    />
                    Пропустить ошибочные строки ({draft.issues.length} ошибок)
                  </label>
                )}
                <label>
                  Куда добавить
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value as typeof mode)}
                  >
                    <option value="append">Добавить к грузу</option>
                    <option value="replace">Заменить весь груз</option>
                  </select>
                </label>
                <button
                  className="primary"
                  disabled={
                    !draft?.cargo.length || (!!draft.issues.length && !skip)
                  }
                  onClick={() => {
                    try {
                      setInput(commitImport(input, draft!, mode, skip));
                      setOpen(false);
                    } catch (e) {
                      setError(
                        e instanceof Error ? e.message : "Ошибка импорта",
                      );
                    }
                  }}
                >
                  Импортировать груз
                </button>
              </>
            )}
            {error && <p role="alert">{error}</p>}
          </section>
        </div>
      )}
    </>
  );
}
