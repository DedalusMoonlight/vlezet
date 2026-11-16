import { section } from "./navigation";
import { test, expect } from "@playwright/test";
test("edits labelled faces, quantity, required units and zero top load on touch", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await section(page, "Груз");
  await page.getByRole("button", { name: "＋ Добавить груз" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Название", { exact: true }).fill("Хрупкий прибор");
  await dialog.getByLabel("Количество", { exact: true }).fill("3");
  await dialog.getByText("Как можно ставить коробку", { exact: true }).click();
  for (const name of ["Перед +X", "Зад -X", "Справа +Y", "Слева -Y", "Верх +Z"])
    await dialog.getByRole("button", { name, exact: true }).click();
  await dialog.getByRole("button", { name: "Низ -Z", exact: true }).click();
  await expect(
    dialog.getByRole("button", { name: "Низ -Z", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await dialog.getByLabel("Ограничить массу сверху").check();
  await expect(
    dialog.getByLabel("Максимальная масса сверху, кг (0 — ничего)"),
  ).toHaveValue("0");
  await dialog.getByRole("button", { name: "Сохранить груз" }).click();
  const row = page
    .locator("article")
    .filter({ has: page.getByRole("button", { name: /Хрупкий прибор.*см/ }) });
  await expect(row).toContainText("× 3");
  await row.getByText("Часть груза обязательна", { exact: true }).click();
  await row
    .getByRole("button", { name: "1 шт. сделать необязательной", exact: true })
    .click();
  await expect(
    page.getByLabel("Обязательный: Хрупкий прибор").last(),
  ).not.toBeChecked();
  await page
    .getByLabel("Дублировать Хрупкий прибор", { exact: true })
    .first()
    .click();
  await expect(
    page.getByLabel("Обязательный: Хрупкий прибор (копия)", { exact: true }),
  ).toBeChecked();
  expect(errors).toEqual([]);
});
test("requires an explicit choice before rounding to millimetres", async ({
  page,
}) => {
  await page.goto("/");
  await section(page, "Груз");
  await page.getByRole("button", { name: "＋ Добавить груз" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name: /Длина,/ }).fill("40,55");
  await expect(dialog.getByRole("button", { name: /Округлить/ })).toBeVisible();
  await dialog.getByRole("button", { name: /Округлить/ }).click();
  await expect(dialog.getByRole("textbox", { name: /Длина,/ })).toHaveValue(
    "40.6",
  );
});
test("marks inline drafts and invalid values as unsafe for a PWA update", async ({
  page,
}) => {
  await page.goto("/");
  const length = page.getByRole("textbox", { name: "Длина, см", exact: true });
  await length.fill("299");
  await expect(page.locator('[data-unsaved="true"]')).toHaveCount(1);
  await page
    .getByLabel(
      "Подтверждаю размеры свободного прямоугольника и доступную грузоподъёмность",
    )
    .check();
  await page.getByRole("button", { name: "Применить размеры" }).click();
  await expect(page.locator('[data-unsaved="true"]')).toHaveCount(0);
  await length.fill("ошибка");
  await expect(length).toHaveAttribute("aria-invalid", "true");
  await expect(
    page.getByRole("button", { name: "Рассчитать загрузку", exact: true }),
  ).toBeDisabled();
  await length.fill("299");
  await page
    .getByLabel(
      "Подтверждаю размеры свободного прямоугольника и доступную грузоподъёмность",
    )
    .check();
  const apply = page.getByRole("button", {
    name: "Применить размеры",
    exact: true,
  });
  if (await apply.isVisible()) await apply.click();
  await page
    .getByRole("button", { name: "Рассчитать загрузку", exact: true })
    .click();
  await expect(page.getByText("План готов", { exact: true })).toBeVisible();
  await expect(page.locator('[data-unsaved="true"]')).toHaveCount(0);
});
