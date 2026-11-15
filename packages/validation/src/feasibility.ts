import type { ProjectInput } from "@vlezet/domain";
import { enumerateOrientations, orientedDimensions } from "./orientation";
import { issue, type ValidationIssue } from "./issues";

// Necessary conditions only: no proof here implies nothing about solvability.
export function infeasibilityProof(input: ProjectInput): ValidationIssue[] {
  const proof: ValidationIssue[] = [];
  const m = input.settings.wallGapMm;
  const usable = [
    input.vehicle.lengthMm - 2 * m,
    input.vehicle.widthMm - 2 * m,
    input.vehicle.heightMm - m,
  ];
  for (const t of input.cargoTypes.filter((t) => t.required))
    if (
      !enumerateOrientations(t).some((o) =>
        orientedDimensions(t, o).every((d, i) => d <= usable[i]),
      )
    )
      proof.push(
        issue(
          "oversize",
          input.instances.filter((i) => i.typeId === t.id).map((i) => i.id),
          "Обязательная коробка не помещается ни в одном разрешённом положении",
        ),
      );
  if (
    input.cargoTypes
      .filter((t) => t.required)
      .reduce((s, t) => s + t.massG * t.quantity, 0) > input.vehicle.payloadG
  )
    proof.push(
      issue(
        "required-weight",
        [],
        "Масса обязательных грузов превышает грузоподъёмность",
      ),
    );
  if (
    input.cargoTypes
      .filter((t) => t.required)
      .reduce(
        (s, t) => s + t.lengthMm * t.widthMm * t.heightMm * t.quantity,
        0,
      ) >
    Math.max(0, usable[0]) * Math.max(0, usable[1]) * Math.max(0, usable[2])
  )
    proof.push(
      issue(
        "required-volume",
        [],
        "Объём обязательных грузов превышает полезный объём",
      ),
    );
  return proof;
}
