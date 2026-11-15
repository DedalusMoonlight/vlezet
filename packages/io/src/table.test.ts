import { it, expect } from "vitest";
import * as XLSX from "xlsx";
import { parseTable, mapCargo } from "./table";
const mapping = {
  name: 0,
  lengthMm: 1,
  widthMm: 2,
  heightMm: 3,
  massG: 4,
  quantity: 5,
};
const units = { dimensions: "cm" as const, mass: "kg" as const };
it("reads decimal commas and rejects a formula even with a cached number", () => {
  const sheet = XLSX.utils.aoa_to_sheet([
    ["Название", "Д", "Ш", "В", "Масса", "Кол"],
    ["Ящик", "40,5", 30, 20, "2,5", 2],
    ["Формула", 40, 30, 20, 1, 1],
  ]);
  sheet.E3 = { t: "n", v: 5, f: "2+3" };
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Грузы");
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([["Другой"]]),
    "Лист 2",
  );
  const bytes = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  const p = parseTable(new Uint8Array(bytes), { headerRow: 1 });
  expect(p.sheets).toEqual(["Грузы", "Лист 2"]);
  const draft = mapCargo(p, mapping, units);
  expect(draft.cargo[0].lengthMm).toBe(405);
  expect(draft.cargo[0].massG).toBe(2500);
  expect(draft.issues[0].row).toBe(3);
  expect(draft.issues[0].field).toBe("massG");
});
it("CSV missing mass, unknown unit and quantity overflow are explicit errors", () => {
  const p = parseTable(
    new TextEncoder().encode(
      "name;l;w;h;kg;n\nbox;10;20;30;;1\nbig;10;20;30;1;301",
    ),
    { headerRow: 1, delimiter: ";" },
  );
  const d = mapCargo(p, mapping, units);
  expect(d.issues.map((i) => [i.row, i.field])).toEqual([
    [2, "massG"],
    [3, "quantity"],
  ]);
  expect(() =>
    mapCargo(p, mapping, { dimensions: "inch", mass: "kg" } as unknown as import("./table").ImportUnits),
  ).toThrow();
});
it("rejects oversize compressed input before parsing", () => {
  expect(() =>
    parseTable(new Uint8Array(10 * 1024 * 1024 + 1), { headerRow: 1 }),
  ).toThrow(/10/);
});
it("reads actual XLS and Windows-1251 fixtures", async () => {
  const { readFileSync } = await import("node:fs");
  for (const file of ["mixed.xls", "mixed.xlsx"]) {
    const p = parseTable(
      new Uint8Array(readFileSync(`fixtures/import/${file}`)),
      { headerRow: 1 },
    );
    const d = mapCargo(p, mapping, units);
    expect(d.cargo.length).toBe(1);
    expect(d.issues.map((i) => i.row)).toEqual([3, 4, 5]);
  }
  const p = parseTable(
    new Uint8Array(readFileSync("fixtures/import/windows1251.csv")),
    { headerRow: 1, encoding: "windows-1251", delimiter: ";" },
  );
  expect(mapCargo(p, mapping, units).cargo[0].name).toBe("Ящик");
});
