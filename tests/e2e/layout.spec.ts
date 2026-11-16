import { test, expect } from "@playwright/test";

test("shows a ready loading plan without manual placement controls", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page
    .getByRole("button", { name: "Рассчитать загрузку", exact: true })
    .click();
  await expect(page.getByText("План готов", { exact: true })).toBeVisible();
  const result = page.getByRole("region", { name: "Результат расчёта" });
  await expect(result.locator("canvas")).toBeVisible();
  await result.screenshot({
    path: `.cache/simple-plan-${test.info().project.name}.png`,
  });
  await expect(result.getByRole("combobox")).toHaveCount(0);
  await expect(result.getByRole("textbox")).toHaveCount(0);
  await expect(
    result.getByRole("button", { name: /правку|Применить позицию/ }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Сверху", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Сверху", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "3D-инструкция", exact: true })
    .click();
  await expect(page.getByText("Шаг 1 из 18", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
