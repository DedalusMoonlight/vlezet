import { writeFileSync } from "node:fs";
import { makeCargo, makeProject, place } from "../fixtures/builders";
import { restoreSolution, encodeProject, templateXlsx } from "@vlezet/io";
const input = makeProject(
  [
    makeCargo({
      id: "base",
      name: "Нижняя опора",
      lengthMm: 500,
      widthMm: 800,
      heightMm: 300,
      quantity: 2,
      massG: 12000,
      stop: 2,
    }),
    makeCargo({
      id: "top",
      name: "Большая коробка",
      lengthMm: 1005,
      widthMm: 800,
      heightMm: 200,
      massG: 15000,
      maxTopLoadG: 0,
      stop: 1,
      allowedDownFaces: ["-Z"],
    }),
  ],
  {
    vehicle: { lengthMm: 1600, widthMm: 1200, heightMm: 900, payloadG: 500000 },
    settings: { wallGapMm: 10, horizontalGapMm: 5, supportModel: "support-v1" },
  },
);
const [a, b, t] = input.instances;
const solution = restoreSolution(input, {
  inputRevisionId: input.revisionId,
  placements: [
    place(a.id, 10, 10, 0),
    place(b.id, 515, 10, 0),
    place(t.id, 10, 10, 300),
  ],
  run: { seed: 42, attempts: 1, algorithmVersion: "verified-demo" },
})!;
writeFileSync(
  "fixtures/demo/multiple-supports.vlezet.json",
  encodeProject(input, solution),
);
writeFileSync("fixtures/demo/template.xlsx", templateXlsx());
