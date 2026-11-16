import { section } from "./navigation";
import { test, expect } from "@playwright/test";

test("tall dialogs stay inside Android system bars in landscape", async ({
  page,
}) => {
  await page.setViewportSize({ width: 740, height: 360 });
  await page.goto("/");
  await page.evaluate(() => {
    for (const [edge, size] of Object.entries({
      top: 36,
      bottom: 48,
      left: 32,
      right: 24,
    })) {
      document.documentElement.style.setProperty(
        `--safe-area-inset-${edge}`,
        `${size}px`,
      );
    }
  });
  await section(page, "Груз");
  await page.getByRole("button", { name: "＋ Добавить груз" }).click();
  const dialog = page.getByRole("dialog");
  const bounds = await dialog.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.y).toBeGreaterThanOrEqual(36);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(360 - 48);
  expect(bounds!.x).toBeGreaterThanOrEqual(32);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(740 - 24);
  const save = dialog.getByRole("button", { name: "Сохранить груз" });
  await save.scrollIntoViewIfNeeded();
  const actionBounds = await save.boundingBox();
  expect(actionBounds!.y + actionBounds!.height).toBeLessThanOrEqual(360 - 48);
  await save.click();
  await expect(dialog).not.toBeVisible();
});
