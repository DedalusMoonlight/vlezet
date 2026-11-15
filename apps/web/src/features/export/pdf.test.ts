import { it, expect } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import { makeProject, place } from "../../../../../fixtures/builders";
import { restoreSolution } from "@vlezet/io";
import { exportPdf } from "./pdf";
it("embeds Cyrillic font, paginates and writes a valid PDF", async () => {
  const input = makeProject();
  const s = restoreSolution(input, {
    inputRevisionId: input.revisionId,
    placements: [place(input.instances[0].id, 0, 0, 0)],
    run: { seed: 1, attempts: 1, algorithmVersion: "test" },
  })!;
  const bytes = await exportPdf(
    input,
    s,
    {
      includeStepImages: false,
      fontBytes: new Uint8Array(
        readFileSync("apps/web/public/fonts/NotoSans.ttf"),
      ),
    },
    async () => new Uint8Array(),
  );
  expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThan(0);
  expect(bytes.length).toBeGreaterThan(1000);
  writeFileSync(".cache/sample.pdf", bytes);
});
