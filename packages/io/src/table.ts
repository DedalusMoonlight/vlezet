import * as XLSX from "xlsx";
import {
  cargoSchema,
  faces,
  normalizeMeasure,
  parseProject,
  reconcileInstances,
  type CargoType,
  type ProjectInput,
} from "@vlezet/domain";
export type ImportIssue = {
  sheet: string;
  row: number;
  field: string;
  message: string;
};
export type TablePreview = {
  sheet: string;
  sheets: string[];
  columns: string[];
  rows: unknown[][];
  rowNumbers: number[];
  formulas: string[];
  issues: ImportIssue[];
};
export type ColumnMapping = Partial<Record<keyof CargoType, number>>;
export type ImportUnits = { dimensions: "mm" | "cm" | "m"; mass: "kg" | "g" };
export type ImportDraft = { cargo: CargoType[]; issues: ImportIssue[] };
function checkZip(bytes: Uint8Array) {
  if (bytes[0] !== 80 || bytes[1] !== 75) return;
  const d = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--)
    if (d.getUint32(i, true) === 0x06054b50) {
      end = i;
      break;
    }
  if (end < 0) throw new Error("Недостоверный ZIP-заголовок");
  if (d.getUint16(end + 4, true) || d.getUint16(end + 6, true))
    throw new Error("Составной ZIP не поддерживается");
  let pos = d.getUint32(end + 16, true),
    total = 0;
  const entries = d.getUint16(end + 10, true);
  if (entries === 65535 || entries > 10000)
    throw new Error("Слишком много ZIP-файлов");
  for (let i = 0; i < entries; i++) {
    if (pos + 46 > end || d.getUint32(pos, true) !== 0x02014b50)
      throw new Error("Недостоверная метаинформация ZIP");
    const original = d.getUint32(pos + 24, true),
      compressed = d.getUint32(pos + 20, true),
      offset = d.getUint32(pos + 42, true);
    total += original;
    if (total > 50 * 1024 * 1024 || original === 0xffffffff)
      throw new Error("Распакованный XLSX превышает 50 МиБ");
    if (
      offset + 30 > bytes.length ||
      d.getUint32(offset, true) !== 0x04034b50 ||
      offset +
        30 +
        d.getUint16(offset + 26, true) +
        d.getUint16(offset + 28, true) +
        compressed >
        pos
    )
      throw new Error("Недостоверный размер ZIP");
    pos +=
      46 +
      d.getUint16(pos + 28, true) +
      d.getUint16(pos + 30, true) +
      d.getUint16(pos + 32, true);
  }
  if (pos !== end) throw new Error("Неподдерживаемая структура ZIP");
}
export function parseTable(
  bytes: Uint8Array,
  options: {
    sheet?: string;
    headerRow: number;
    encoding?: string;
    delimiter?: string;
  },
): TablePreview {
  if (bytes.length > 10 * 1024 * 1024) throw new Error("Файл больше 10 МиБ");
  if (
    !Number.isInteger(options.headerRow) ||
    options.headerRow < 1 ||
    options.headerRow > 1000
  )
    throw new Error("Строка заголовка: от 1 до 1000");
  checkZip(bytes);
  const binary =
    (bytes[0] === 80 && bytes[1] === 75) ||
    (bytes[0] === 208 && bytes[1] === 207);
  const raw = binary
    ? bytes
    : new TextDecoder(options.encoding ?? "utf-8", { fatal: true }).decode(
        bytes,
      );
  const wb = XLSX.read(raw, {
    type: binary ? "array" : "string",
    raw: true,
    cellFormula: true,
    cellHTML: false,
    cellStyles: false,
    bookVBA: false,
    FS: options.delimiter,
  });
  const sheet = options.sheet ?? wb.SheetNames[0];
  if (!wb.Sheets[sheet]) throw new Error("Лист не найден");
  const ws = wb.Sheets[sheet];
  const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
  if ((range.e.r + 1) * (range.e.c + 1) > 100000)
    throw new Error("Лист больше 100 000 ячеек");
  const header = options.headerRow - 1;
  const columns = Array.from({ length: range.e.c + 1 }, (_, c) =>
    String(
      ws[XLSX.utils.encode_cell({ r: header, c })]?.v ?? `Колонка ${c + 1}`,
    ).slice(0, 120),
  );
  const rows: unknown[][] = [],
    rowNumbers: number[] = [],
    formulas: string[] = [];
  for (let r = header + 1; r <= range.e.r; r++) {
    const row = columns.map((_, c) => {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (cell?.f) formulas.push(`${r + 1}:${c}`);
      const v = cell?.v;
      return typeof v === "string" ? v.slice(0, 1000) : (v ?? "");
    });
    if (row.some((v) => v !== "")) {
      rows.push(row);
      rowNumbers.push(r + 1);
    }
    if (rows.length > 1000)
      throw new Error("Больше 1000 непустых строк; разделите файл");
  }
  return {
    sheet,
    sheets: wb.SheetNames,
    columns,
    rows,
    rowNumbers,
    formulas,
    issues: [],
  };
}
export function mapCargo(
  p: TablePreview,
  mapping: ColumnMapping,
  units: ImportUnits,
): ImportDraft {
  if (
    !["mm", "cm", "m"].includes(units.dimensions) ||
    !["kg", "g"].includes(units.mass)
  )
    throw new Error("Неизвестные единицы");
  const cargo: CargoType[] = [],
    issues: ImportIssue[] = [...p.issues];
  p.rows.forEach((row, index) => {
    const line = p.rowNumbers[index];
    const before = issues.length;
    const issue = (field: string, message: string) =>
      issues.push({ sheet: p.sheet, row: line, field, message });
    const get = (key: keyof CargoType) => {
      const col = mapping[key];
      if (col === undefined) return "";
      if (p.formulas.includes(`${line}:${col}`)) {
        issue(key, "Формула не допускается. Вставьте значение.");
        return "";
      }
      return String(row[col] ?? "").trim();
    };
    const measure = (
      key: "lengthMm" | "widthMm" | "heightMm" | "massG" | "maxTopLoadG",
      unit: ImportUnits["dimensions"] | ImportUnits["mass"],
      optional = false,
    ) => {
      const t = get(key);
      if (optional && !t) return null;
      if (optional && /^0+(?:[.,]0+)?$/.test(t)) return 0;
      const n = normalizeMeasure(t, unit);
      if (!n.ok) {
        if (!issues.some((i) => i.row === line && i.field === key))
          issue(key, n.error);
        return 0;
      }
      return n.value;
    };
    const integer = (key: "quantity" | "stop", fallback: number) => {
      const text = get(key);
      const n = text === "" ? fallback : Number(text.replace(",", "."));
      if (
        !Number.isInteger(n) ||
        n < 1 ||
        n > (key === "quantity" ? 300 : 100000)
      )
        issue(key, "Ожидается целое положительное число в пределах проекта");
      return n;
    };
    const name = get("name");
    if (!name) issue("name", "Нет названия");
    const requiredText = get("required").toLowerCase();
    if (
      requiredText &&
      !["да", "нет", "true", "false", "1", "0"].includes(requiredText)
    )
      issue("required", "Используйте да / нет");
    const faceText = get("allowedDownFaces");
    const allowedDownFaces = faceText ? faceText.split(/[ ,;]+/) : [...faces];
    if (
      allowedDownFaces.some((f) => !faces.includes(f as (typeof faces)[number]))
    )
      issue("allowedDownFaces", "Грани: +X -X +Y -Y +Z -Z");
    const candidate = {
      id: crypto.randomUUID(),
      name,
      lengthMm: measure("lengthMm", units.dimensions),
      widthMm: measure("widthMm", units.dimensions),
      heightMm: measure("heightMm", units.dimensions),
      massG: measure("massG", units.mass),
      quantity: integer("quantity", 1),
      stop: integer("stop", 1),
      required: !["нет", "false", "0"].includes(requiredText),
      allowedDownFaces,
      maxTopLoadG: measure("maxTopLoadG", units.mass, true),
    };
    const parsed = cargoSchema.safeParse(candidate);
    if (issues.length === before) {
      if (parsed.success) cargo.push(parsed.data);
      else
        parsed.error.issues.forEach((e) =>
          issue(String(e.path[0]), "Значение вне допустимых пределов"),
        );
    }
  });
  return { cargo, issues };
}
export function commitImport(
  input: ProjectInput,
  draft: ImportDraft,
  mode: "append" | "replace",
  skipInvalid: boolean,
): ProjectInput {
  if (draft.issues.length && !skipInvalid)
    throw new Error("Есть ошибочные строки");
  if (!draft.cargo.length) throw new Error("Нет корректных строк");
  const cargoTypes =
    mode === "append" ? [...input.cargoTypes, ...draft.cargo] : draft.cargo;
  return parseProject({
    ...input,
    cargoTypes,
    instances: reconcileInstances(
      mode === "append" ? input.instances : [],
      cargoTypes,
    ),
  });
}
export function templateXlsx(): Uint8Array {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      [
        "Название",
        "Длина",
        "Ширина",
        "Высота",
        "Масса",
        "Количество",
        "Остановка",
        "Обязательный",
        "Грани",
        "Масса сверху",
      ],
      ["Коробка", 60, 40, 30, 12, 4, 1, "да", "+X -X +Y -Y +Z -Z", ""],
    ]),
    "Грузы",
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ["Справка"],
      ["Размеры: см; массы: кг. Единицы выберите при импорте."],
      ["Грани: +Z верх, -Z низ, +X перед, -X зад, +Y справа, -Y слева."],
      ["Пустой лимит сверху — без ограничения; 0 — ничего сверху."],
      ["Формулы не поддерживаются: вставляйте значения."],
    ]),
    "Справка",
  );
  return new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" }));
}
