import { writeFileSync } from "node:fs";
import * as XLSX from "xlsx";
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet([
  ["Название", "Длина", "Ширина", "Высота", "Масса", "Количество"],
  ["Ящик", "40,5", 30, 20, "2,5", 2],
  ["Формула", 40, 30, 20, 5, 1],
  ["Без массы", 40, 30, 20, "", 1],
  ["Предел", 40, 30, 20, 1, 301],
]);
ws.E3 = { t: "n", v: 5, f: "2+3" };
// BIFF8 token stream for 2+3; SheetJS CE writes .bf when producing XLS.
Object.assign(ws.E3, { bf: [7, 0, 0x1e, 2, 0, 0x1e, 3, 0, 0x03] });
XLSX.utils.book_append_sheet(wb, ws, "Грузы");
XLSX.utils.book_append_sheet(
  wb,
  XLSX.utils.aoa_to_sheet([
    ["Название", "Длина", "Ширина", "Высота", "Масса"],
    ["Второй", 10, 10, 10, 1],
  ]),
  "Второй",
);
for (const bookType of ["xlsx", "xls"] as const)
  writeFileSync(
    `fixtures/import/mixed.${bookType}`,
    XLSX.write(wb, { type: "buffer", bookType }),
  );
const csv =
  "Название;Длина;Ширина;Высота;Масса;Количество\nЯщик;40,5;30;20;2,5;2";
writeFileSync("fixtures/import/decimal.csv", csv);
writeFileSync(
  "fixtures/import/windows1251.csv",
  Buffer.from(
    [...csv].map((c) => {
      const n = c.charCodeAt(0);
      return n >= 0x410 && n <= 0x44f ? n - 0x410 + 0xc0 : n;
    }),
  ),
);
