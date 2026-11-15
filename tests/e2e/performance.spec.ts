import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
test("measures fixed 100-box corpus and 3D frame cadence", async ({ page }) => {
  test.skip(!process.env.PW_BENCH, "Explicit performance run");
  test.setTimeout(180000);
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Открыть JSON", exact: true }),
  ).toBeVisible();
  const manifest = JSON.parse(
    readFileSync("fixtures/benchmarks/manifest.json", "utf8"),
  );
  const rows = [];
  for (const item of manifest.cases) {
    const { input } = JSON.parse(
      readFileSync(`fixtures/benchmarks/${item.file}`, "utf8"),
    );
    await page
      .getByLabel("Файл проекта JSON")
      .setInputFiles({
        name: "benchmark.json",
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
    await expect(
      page.getByText("План готов", { exact: true }),
    ).not.toBeVisible();
    const start = Date.now();
    await page
      .getByRole("button", { name: "Рассчитать загрузку", exact: true })
      .click();
    await expect(page.getByText("План готов", { exact: true })).toBeVisible({
      timeout: 10000,
    });
    rows.push({ id: item.id, timeToReadyMs: Date.now() - start });
  }
  const canvas = page.locator(".cargo-scene canvas");
  await canvas.scrollIntoViewIfNeeded();
  const bounds = (await canvas.boundingBox())!;
  const frames = page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        let count = 0;
        const start = performance.now();
        const tick = () => {
          count++;
          const elapsed = performance.now() - start;
          if (elapsed >= 2000) resolve((count * 1000) / elapsed);
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
  );
  await page.mouse.move(
    bounds.x + bounds.width * 0.4,
    bounds.y + bounds.height * 0.5,
  );
  await page.mouse.down();
  for (let i = 0; i < 20; i++)
    await page.mouse.move(
      bounds.x + bounds.width * (0.4 + i * 0.01),
      bounds.y + bounds.height * (0.5 + i * 0.005),
      { steps: 3 },
    );
  await page.mouse.up();
  const fps = await frames;
  writeFileSync(
    `.cache/browser-performance-${test.info().project.name}.json`,
    JSON.stringify({ project: test.info().project.name, rows, fps }, null, 2),
  );
  expect(
    rows.filter((r) => r.timeToReadyMs <= 5000).length,
  ).toBeGreaterThanOrEqual(18);
  expect(fps).toBeGreaterThanOrEqual(30);
});
