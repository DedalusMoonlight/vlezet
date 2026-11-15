import { test, expect } from "@playwright/test";
test("walks loading and unloading by stop without repeating removals", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Рассчитать загрузку", exact: true })
    .click();
  await expect(page.getByText("План готов", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "3D-инструкция", exact: true })
    .click();
  await expect(page.getByText("Шаг 1 из 18", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Выгрузка", exact: true }).click();
  await page.getByLabel("Коробка обработана").check();
  await page.getByRole("button", { name: "Дальше", exact: true }).click();
  await expect(page.getByText("Шаг 2 из 18", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Назад", exact: true }).click();
  await expect(page.getByLabel("Коробка обработана")).toBeChecked();
  await page.getByLabel("Перейти к остановке").selectOption("3");
  await expect(page.getByLabel("Перейти к остановке")).toHaveValue("3");
  await page.getByRole("button", { name: "Показать движение" }).click();
  await expect(
    page.getByRole("button", { name: "Пауза", exact: true }),
  ).toBeVisible();
});
