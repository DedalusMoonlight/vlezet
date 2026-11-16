import { test, expect } from "@playwright/test";
import { makeCargo, makeProject } from "../../fixtures/builders";

const cargoName = "Посуда для кухни — стеклянные бокалы и тарелки";

test("3D labels preserve user names and stay readable when zoomed out", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const input = makeProject(
    [makeCargo({ id: "internal-cargo", name: cargoName, quantity: 2 })],
    {
      vehicle: { lengthMm: 200, widthMm: 100, heightMm: 100, payloadG: 10000 },
    },
  );
  await page.goto("/");
  await page.getByLabel("Файл проекта JSON").setInputFiles({
    name: "labels.json",
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
  await expect(page.getByText("План готов", { exact: true })).toBeVisible();
  await page.locator(".cargo-scene canvas").click();
  const label = page.locator(".scene-cargo-label");
  await expect(label).toBeVisible();
  await expect(label.locator("strong")).toHaveText(cargoName);
  await expect(label).toContainText(/№[12]/);
  await expect(label).not.toContainText("internal-cargo");
  const before = await label.boundingBox();
  expect(
    await label
      .locator("strong")
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
  ).toBeGreaterThanOrEqual(16);
  const canvas = page.locator(".cargo-scene canvas");
  await canvas.hover();
  if (test.info().project.name !== "webkit") await page.mouse.wheel(0, 1200);
  await expect(label).toBeVisible();
  await expect
    .poll(async () => (await label.boundingBox())!.height)
    .toBeCloseTo(before!.height, 0);
  await page.getByRole("button", { name: "Сверху", exact: true }).click();
  await expect(label.locator("strong")).toHaveText(cargoName);
  const bounds = await label.boundingBox();
  const scene = await page.locator(".cargo-scene").boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(scene!.x);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(
    scene!.x + scene!.width,
  );
  await page
    .locator(".cargo-scene")
    .screenshot({ path: `.cache/scene-label-${test.info().project.name}.png` });
  await page
    .getByRole("button", { name: "3D-инструкция", exact: true })
    .click();
  await expect(label.locator("strong")).toHaveText(cargoName);
  await expect(page.locator(".step-card")).not.toContainText("internal-cargo");
  await page.getByRole("button", { name: "Дальше", exact: true }).click();
  await expect(label.locator("strong")).toHaveText(cargoName);
  expect(errors).toEqual([]);
});
