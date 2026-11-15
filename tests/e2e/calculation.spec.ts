import { test, expect } from "@playwright/test";
test("calculates a plan on the device without freezing controls", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Рассчитать загрузку", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "План готов" }),
  ).toHaveText("План готов", {
    timeout: 15000,
  });
  await expect(page.getByText("Размещено: 18 из 18")).toBeVisible();
});
test("cancel remains explicit even when a partial result is available", async ({
  page,
}) => {
  const { readFileSync } = await import("node:fs");
  const { input } = JSON.parse(
    readFileSync("fixtures/benchmarks/cases/09.json", "utf8"),
  );
  input.vehicle.heightMm = 3000;
  input.vehicle.payloadG = 3000000;
  for (const c of input.cargoTypes) {
    c.quantity = 15;
    c.maxTopLoadG = 0;
  }
  input.instances = input.cargoTypes.flatMap((c: { id: string }) =>
    Array.from({ length: 15 }, (_, i) => ({
      id: `${c.id}-${i}`,
      typeId: c.id,
    })),
  );
  await page.goto("/");
  await page
    .getByLabel("Файл проекта JSON")
    .setInputFiles({
      name: "cancel.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify({
          format: "vlezet",
          schemaVersion: 1,
          input,
          solution: null,
        }),
      ),
    });
  await page
    .getByRole("button", { name: "Рассчитать загрузку", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Отменить расчёт", exact: true })
    .click();
  await expect(page.getByText("Расчёт отменён", { exact: true })).toBeVisible({
    timeout: 3000,
  });
});
