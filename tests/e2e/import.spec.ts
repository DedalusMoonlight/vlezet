import { section, files } from "./navigation";
import { test, expect } from "@playwright/test";
test("imports decimal comma CSV after explicit preview", async ({ page }) => {
  await page.goto("/");
  await files(page);
  await page.getByRole("button", { name: "Импорт Excel / CSV" }).click();
  const d = page.getByRole("dialog");
  await d
    .getByLabel("Файл таблицы")
    .setInputFiles("fixtures/import/decimal.csv");
  await expect(d.getByText("Корректных строк: 1 из 1")).toBeVisible();
  await d
    .getByRole("button", { name: "Импортировать груз", exact: true })
    .click();
  await section(page, "Груз");
  await expect(
    page.getByRole("button", { name: /Ящик 40.5 × 30 × 20 см/ }),
  ).toBeVisible();
});
