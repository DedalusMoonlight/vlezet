import { mkdirSync, writeFileSync } from "node:fs";
import { makeProject, makeCargo, place } from "../fixtures/builders";
import { validatePlan } from "@vlezet/validation";
mkdirSync("fixtures/benchmarks/cases", { recursive: true });
const manifest = [];
for (let n = 0; n < 20; n++) {
  const kind = n < 8 ? "floor" : n < 16 ? "columns" : "mixed";
  const gap = n % 2 ? 5 : 0,
    wall = 10;
  const cargo = Array.from({ length: 20 }, (_, i) =>
    makeCargo({
      id: `t${i + 1}`,
      name: `Груз ${i + 1}`,
      quantity: 5,
      lengthMm: 200 + (n % 5) * 10 + (i % 4) * 5,
      widthMm: 150 + ((n + i) % 3) * 5,
      heightMm: 100 + ((n * 7 + i) % 4) * 10,
      massG: 5000 + (i % 4) * 1000,
      stop: Math.floor(i / 4) + 1,
      allowedDownFaces: ["-Z"],
      maxTopLoadG: 40000,
    }),
  );
  const maxL = Math.max(...cargo.map((c) => c.lengthMm)),
    maxW = Math.max(...cargo.map((c) => c.widthMm)),
    maxH = Math.max(...cargo.map((c) => c.heightMm));
  const slots = kind === "floor" ? 5 : kind === "columns" ? 1 : 3;
  const input = makeProject(cargo, {
    revisionId: `benchmark-v1-${n + 1}`,
    vehicle: {
      lengthMm: 2 * wall + 5 * slots * (maxL + gap) - gap,
      widthMm: 2 * wall + 4 * (maxW + gap) - gap,
      heightMm:
        wall + (kind === "floor" ? 1 : kind === "columns" ? 5 : 2) * maxH,
      payloadG: 1000000,
    },
    settings: {
      wallGapMm: wall,
      horizontalGapMm: gap,
      supportModel: "support-v1",
    },
  });
  const witness = input.instances.map((inst) => {
    const typeIndex = cargo.findIndex((c) => c.id === inst.typeId),
      c = cargo[typeIndex],
      k = input.instances
        .filter((i) => i.typeId === c.id)
        .findIndex((i) => i.id === inst.id);
    const slot = kind === "floor" ? k : kind === "columns" ? 0 : k % 3;
    const layer =
      kind === "floor" ? 0 : kind === "columns" ? k : Math.floor(k / 3);
    return place(
      inst.id,
      wall + ((c.stop - 1) * slots + slot) * (maxL + gap),
      wall + (typeIndex % 4) * (maxW + gap),
      layer * c.heightMm,
    );
  });
  const validation = validatePlan(input, witness);
  if (!validation.valid) throw new Error(JSON.stringify(validation.issues));
  const id = String(n + 1).padStart(2, "0");
  writeFileSync(
    `fixtures/benchmarks/cases/${id}.json`,
    JSON.stringify({ input, witness }, null, 2) + "\n",
  );
  manifest.push({
    id,
    kind,
    knownSolvable: true,
    boxes: 100,
    types: 20,
    stops: 5,
    file: `cases/${id}.json`,
  });
}
writeFileSync(
  "fixtures/benchmarks/manifest.json",
  JSON.stringify(
    {
      version: 1,
      createdAt: "2026-11-15",
      frozenBeforeMeasurement: true,
      cases: manifest,
    },
    null,
    2,
  ) + "\n",
);
