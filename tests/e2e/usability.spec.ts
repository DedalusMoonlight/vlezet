import { section } from "./navigation";
import { test, expect } from "@playwright/test";
test("quantity and stop can be cleared and replaced without an injected zero", async ({
  page,
}) => {
  await page.goto("/");
  await section(page, "Груз");
  await page.getByRole("button", { name: "＋ Добавить груз" }).click();
  const dialog = page.getByRole("dialog");
  for (const label of ["Количество", "Остановка"]) {
    const input = dialog.getByLabel(label, { exact: true });
    await input.fill("");
    await expect(input).toHaveValue("");
    await input.pressSequentially("12");
    await expect(input).toHaveValue("12");
  }
  await dialog.getByLabel("Количество", { exact: true }).fill("");
  await dialog.getByRole("button", { name: "Сохранить груз" }).click();
  await expect(dialog).toBeVisible();
});
test("invalid or unapplied vehicle values cannot calculate the previous vehicle", async ({
  page,
}) => {
  await page.goto("/");
  const length = page.getByRole("textbox", { name: "Длина, см", exact: true });
  await length.fill("");
  await expect(
    page.getByRole("button", { name: "Рассчитать загрузку", exact: true }),
  ).toBeDisabled();
  await length.fill("299");
  await expect(
    page.getByRole("button", { name: "Рассчитать загрузку", exact: true }),
  ).toBeDisabled();
});

test("mobile sections fit the screen and keep an unfinished vehicle draft", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "Длина, см", exact: true })
    .fill("345");
  await section(page, "Груз");
  await expect(
    page.getByRole("button", { name: "＋ Добавить груз" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await section(page, "Машина");
  await expect(
    page.getByRole("textbox", { name: "Длина, см", exact: true }),
  ).toHaveValue("345");
});

test("offers a full load for a new stop order and only applies it on request", async ({
  page,
}) => {
  const { makeProject, makeCargo } = await import("../../fixtures/builders");
  const input = makeProject(
    [
      makeCargo({
        id: "base",
        name: "Опоры",
        quantity: 2,
        stop: 10,
        allowedDownFaces: ["-Z"],
      }),
      makeCargo({
        id: "top",
        name: "Хрупкий прибор",
        lengthMm: 200,
        stop: 20,
        maxTopLoadG: 0,
        allowedDownFaces: ["-Z"],
      }),
    ],
    {
      vehicle: { lengthMm: 200, widthMm: 100, heightMm: 200, payloadG: 10000 },
    },
  );
  await page.goto("/");
  await page.getByLabel("Файл проекта JSON").setInputFiles({
    name: "route.json",
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
  const suggestion = page.getByRole("complementary", {
    name: "Другой порядок остановок",
  });
  await expect(suggestion).toBeVisible({ timeout: 15000 });
  await expect(suggestion.locator("li strong")).toHaveText([
    "Точка 20",
    "Точка 10",
  ]);
  await section(page, "Груз");
  await expect(
    page.locator(".cargo-row").filter({ hasText: "Хрупкий прибор" }),
  ).toContainText("Точка 20");
  await section(page, "План");
  await suggestion
    .getByRole("button", { name: "Применить порядок и план" })
    .click();
  await expect(
    page.getByText("Размещено: 3 из 3", { exact: true }),
  ).toBeVisible();
  await expect(suggestion).not.toBeVisible();
  await page
    .getByRole("button", { name: "3D-инструкция", exact: true })
    .click();
  await page.getByRole("button", { name: "Выгрузка", exact: true }).click();
  await expect(page.locator(".step-card")).toContainText("Хрупкий прибор");
  await expect(
    page.getByText("Сохранено на устройстве", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await section(page, "План");
  await expect(
    page.getByText("Размещено: 3 из 3", { exact: true }),
  ).toBeVisible();
});

test("applying dimensions does not silently replace an invalid gap", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByText("Зазоры и точность", { exact: true }).click();
  await page.getByLabel("До стен и потолка, мм", { exact: true }).fill("");
  await page
    .getByRole("textbox", { name: "Длина, см", exact: true })
    .fill("299");
  await page
    .getByLabel(
      "Подтверждаю размеры свободного прямоугольника и доступную грузоподъёмность",
    )
    .check();
  await page
    .getByRole("button", { name: "Применить размеры", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Рассчитать загрузку", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByLabel("До стен и потолка, мм", { exact: true }),
  ).toHaveValue("");
});

test("reopening import restores a valid header row after an empty draft", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByText("Файлы и обмен", { exact: true }).click();
  await page.getByRole("button", { name: "Импорт Excel / CSV" }).click();
  let dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Файл таблицы")
    .setInputFiles("fixtures/import/decimal.csv");
  await expect(dialog.getByText("Корректных строк: 1 из 1")).toBeVisible();
  await dialog.getByLabel("Заголовок в строке", { exact: true }).fill("");
  await dialog.getByRole("button", { name: "Закрыть импорт" }).click();
  await page.getByRole("button", { name: "Импорт Excel / CSV" }).click();
  dialog = page.getByRole("dialog");
  await expect(
    dialog.getByLabel("Заголовок в строке", { exact: true }),
  ).toHaveValue("1");
  await expect(
    dialog.getByRole("button", { name: "Перечитать с этими настройками" }),
  ).toBeEnabled();
});
