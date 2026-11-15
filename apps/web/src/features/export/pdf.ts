import { PDFDocument, rgb, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { ProjectInput } from "@vlezet/domain";
import type { Solution } from "@vlezet/packing";
import { validatePlan } from "@vlezet/validation";
export type PdfOptions = {
  includeStepImages: boolean;
  fontBytes?: Uint8Array;
  signal?: AbortSignal;
  onProgress?: (done: number, total: number) => void;
};
export async function exportPdf(
  input: ProjectInput,
  solution: Solution,
  options: PdfOptions,
  renderFrame: (step: number | null) => Promise<Uint8Array>,
): Promise<Uint8Array> {
  const report = validatePlan(input, solution.placements, {
    requireAllRequired: false,
  });
  if (!report.valid || solution.inputRevisionId !== input.revisionId)
    throw new Error("Сначала пересчитайте допустимую раскладку");
  const bytes =
    options.fontBytes ??
    new Uint8Array(await (await fetch("/fonts/NotoSans.ttf")).arrayBuffer());
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(bytes, { subset: true });
  pdf.setTitle("Влезет. План загрузки");
  pdf.setLanguage("ru-RU");
  let page!: PDFPage;
  let y = 0;
  let pageNumber = 0;
  const newPage = () => {
    page = pdf.addPage([595, 842]);
    pageNumber++;
    page.drawText(`Влезет. Покажем, как  /  ${pageNumber}`, {
      x: 36,
      y: 26,
      size: 9,
      font,
      color: rgb(0.35, 0.45, 0.36),
    });
    y = 795;
  };
  newPage();
  const line = (text: string, size = 10) => {
    // Control characters from imported names must not enter PDF text operators.
    // eslint-disable-next-line no-control-regex
    const cleaned = text.replace(/[\x00-\x1f]/g, " ");
    let current = "";
    for (const char of cleaned) {
      if (font.widthOfTextAtSize(current + char, size) > 520) {
        if (y < 60) newPage();
        page.drawText(current, {
          x: 36,
          y,
          size,
          font,
          color: rgb(0.1, 0.22, 0.16),
        });
        y -= size + 6;
        current = char;
      } else current += char;
    }
    if (y < 60) newPage();
    page.drawText(current, {
      x: 36,
      y,
      size,
      font,
      color: rgb(0.1, 0.22, 0.16),
    });
    y -= size + 8;
  };
  const check = () => {
    if (options.signal?.aborted)
      throw new DOMException("Экспорт отменён", "AbortError");
  };
  line("Влезет. Покажем, как", 23);
  line("План загрузки • лучший найденный вариант", 13);
  line(
    `Кузов: ${input.vehicle.lengthMm} × ${input.vehicle.widthMm} × ${input.vehicle.heightMm} мм. Допустимая масса: ${input.vehicle.payloadG / 1000} кг.`,
  );
  line(
    `Зазоры: стены/потолок ${input.settings.wallGapMm} мм; между коробками ${input.settings.horizontalGapMm} мм.`,
  );
  line(
    `Размещено ${solution.placements.length} из ${input.instances.length}. Масса ${report.loads.floorLoadG / 1000} кг.`,
  );
  if (solution.status !== "ready")
    line("ЧАСТИЧНЫЙ ПЛАН. Обязательный груз может быть не размещён.", 12);
  check();
  const overview = await renderFrame(null);
  if (overview.length) {
    const image = await pdf.embedPng(overview);
    page.drawImage(image, { x: 36, y: y - 260, width: 520, height: 260 });
    y -= 280;
  }
  line("Ведомость груза", 15);
  for (const c of input.cargoTypes) {
    line(
      `${c.name}: ${c.lengthMm} × ${c.widthMm} × ${c.heightMm} мм; ${c.massG / 1000} кг × ${c.quantity}; остановка ${c.stop}; ${c.required ? "обязательный" : "необязательный"}.`,
    );
    line(
      `Грани снизу: ${c.allowedDownFaces.join(", ")}. Сверху: ${c.maxTopLoadG === null ? "без ограничения" : c.maxTopLoadG / 1000 + " кг"}.`,
      9,
    );
  }
  line("Размещение (мм, от задних дверей / слева / от пола)", 14);
  for (const p of solution.placements)
    line(
      `${p.instanceId}: ${p.position.x} / ${p.position.y} / ${p.position.z}; снизу ${p.orientation.downFace}; поворот ${p.orientation.yawQuarterTurns * 90}°; сверху ${(report.loads.topLoadG[p.instanceId] ?? 0) / 1000} кг.`,
      9,
    );
  line("Не размещено", 14);
  const ids = new Set(solution.placements.map((p) => p.instanceId));
  for (const i of input.instances.filter((i) => !ids.has(i.id))) line(i.id);
  if (ids.size === input.instances.length) line("Весь груз размещён.");
  line("Границы модели", 14);
  line(
    "Прямоугольные жёсткие коробки. Опора: минимум 95%, все углы поддержаны, только узкие щели до 5 мм. Масса распределяется по фактической площади контакта. Это приближение, не расчёт устойчивости упаковки.",
  );
  line(
    "Крепление, динамические нагрузки, распределение по осям автомобиля и ручная переноска не рассчитываются. Проверьте фактический проём, свободный объём и прочность упаковки.",
  );
  if (solution.status === "ready") {
    line("Порядок загрузки", 14);
    report.loadSteps.forEach((s, i) =>
      line(`${i + 1}. ${s.instanceId} — остановка ${s.stop}`, 9),
    );
    line("Порядок выгрузки", 14);
    report.unloadSteps.forEach((s, i) =>
      line(`${i + 1}. ${s.instanceId} — остановка ${s.stop}`, 9),
    );
  }
  if (options.includeStepImages && solution.status === "ready") {
    for (let i = 0; i < report.loadSteps.length; i++) {
      check();
      if (i % 4 === 0) newPage();
      const frame = await renderFrame(i);
      check();
      const x = 36 + (i % 2) * 265,
        top = 775 - Math.floor((i % 4) / 2) * 350;
      page.drawText(
        `Шаг ${i + 1}: ${report.loadSteps[i].instanceId.slice(0, 24)}`,
        { x, y: top, size: 9, font },
      );
      if (frame.length) {
        const image = await pdf.embedPng(frame);
        page.drawImage(image, { x, y: top - 155, width: 255, height: 145 });
      }
      options.onProgress?.(i + 1, report.loadSteps.length);
      await new Promise((r) => setTimeout(r, 0));
    }
  }
  check();
  return pdf.save();
}
