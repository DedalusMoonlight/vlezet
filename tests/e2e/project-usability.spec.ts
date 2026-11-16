import { test, expect, type Page } from "@playwright/test";
import { makeCargo, makeProject } from "../../fixtures/builders";

async function section(page: Page, title: string) {
  const nav = page.getByRole("navigation", { name: "Разделы проекта" });
  if (await nav.isVisible())
    await nav.getByRole("button", { name: title, exact: true }).click();
}

test("new calculation keeps vehicle and can recover the previous plan after reload", async ({
  page,
}) => {
  await page.goto("/");
  const length = await page
    .getByRole("textbox", { name: "Длина, см", exact: true })
    .inputValue();
  await page
    .getByRole("button", { name: "Рассчитать загрузку", exact: true })
    .click();
  await expect(page.getByText("План готов", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Новый расчёт", exact: true }).click();
  await page.getByRole("button", { name: "Отмена", exact: true }).click();
  await expect(page.getByText("План готов", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Новый расчёт", exact: true }).click();
  await page
    .getByRole("button", { name: "Начать с пустого списка", exact: true })
    .click();
  await expect(
    page.getByText("Добавьте первую коробку или импортируйте таблицу."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Рассчитать загрузку", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText("Сохранено на устройстве", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Длина, см", exact: true }),
  ).toHaveValue(length);
  await page.getByRole("button", { name: "Новый расчёт", exact: true }).click();
  await page
    .getByRole("button", { name: "Вернуть предыдущий расчёт", exact: true })
    .click();
  await expect(page.getByText("План готов", { exact: true })).toBeVisible();
  await expect(page.locator(".result-summary")).toHaveText(
    "Размещено: 18 из 18",
  );
  // Close immediately after recovery, before the normal autosave debounce.
  await page.reload();
  await section(page, "План");
  await expect(page.locator(".result-summary")).toHaveText(
    "Размещено: 18 из 18",
  );
  await section(page, "Груз");
  await expect(page.locator(".cargo-row")).toHaveCount(3);
});

test("vehicle identity and measured dimensions survive applying and reloading", async ({
  page,
}) => {
  await page.goto("/");
  const select = page.getByRole("combobox", { name: "Машина", exact: true });
  await select.selectOption("largus-van");
  await page
    .getByRole("textbox", { name: "Длина, см", exact: true })
    .fill("190");
  await page
    .getByRole("textbox", { name: "Ширина, см", exact: true })
    .fill("95");
  await page
    .getByRole("textbox", { name: "Высота, см", exact: true })
    .fill("90");
  await page
    .getByRole("textbox", {
      name: "Доступная грузоподъёмность, кг",
      exact: true,
    })
    .fill("400");
  await page.getByRole("checkbox", { name: /Подтверждаю размеры/ }).check();
  await page
    .getByRole("button", { name: "Применить размеры", exact: true })
    .click();
  await expect(select).toHaveValue("largus-van");
  await expect(
    page.getByText("Сохранено на устройстве", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(select).toHaveValue("largus-van");
  await expect(
    page.getByRole("textbox", { name: "Длина, см", exact: true }),
  ).toHaveValue("190");
  await expect(
    page.getByRole("button", { name: "Рассчитать загрузку", exact: true }),
  ).toBeEnabled();
});

test("partial load groups same-name cargo separately by stop and requirement", async ({
  page,
}) => {
  const input = makeProject(
    [
      makeCargo({ id: "required", name: "Посуда", quantity: 1 }),
      makeCargo({
        id: "optional",
        name: "Посуда",
        quantity: 3,
        required: false,
        stop: 2,
      }),
    ],
    {
      vehicle: { lengthMm: 100, widthMm: 100, heightMm: 100, payloadG: 10000 },
    },
  );
  await page.goto("/");
  await page.getByLabel("Файл проекта JSON").setInputFiles({
    name: "partial.json",
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
  await expect(page.locator(".cargo-row").nth(0)).toContainText("Обязательный");
  await expect(page.locator(".cargo-row").nth(1)).toContainText(
    "Необязательный",
  );
  await page
    .getByRole("button", { name: "Рассчитать загрузку", exact: true })
    .click();
  const summary = page.getByRole("region", { name: "Что вошло в план" });
  await expect(summary.locator("article")).toHaveCount(2);
  await expect(summary.locator("article").nth(0)).toContainText(
    "Размещено 1 из 1",
  );
  await expect(summary.locator("article").nth(1)).toContainText(
    "Размещено 0 из 3",
  );
  await expect(summary.locator("article").nth(1)).toContainText("Осталось 3");
  await expect(summary.locator("article").nth(1)).toContainText(
    "Точка 2 · Необязательный",
  );
});

test("a failed backup never clears the current cargo or plan", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Рассчитать загрузку", exact: true })
    .click();
  await expect(page.getByText("План готов", { exact: true })).toBeVisible();
  await page.evaluate(() => {
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value, key) {
      if (value?.id === "previous")
        throw new DOMException("Disk full", "QuotaExceededError");
      return put.call(this, value, key);
    };
  });
  await page.getByRole("button", { name: "Новый расчёт", exact: true }).click();
  await page
    .getByRole("button", { name: "Начать с пустого списка", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Текущие данные не изменены",
  );
  await page.getByRole("button", { name: "Отмена", exact: true }).click();
  await expect(page.getByText("План готов", { exact: true })).toBeVisible();
  await expect(page.locator(".result-summary")).toHaveText(
    "Размещено: 18 из 18",
  );
});

test("starting a new calculation discards an invalid unapplied vehicle draft", async ({
  page,
}) => {
  await page.goto("/");
  const width = page.getByRole("textbox", { name: "Ширина, см", exact: true });
  const original = await width.inputValue();
  await width.fill("invalid");
  await page.getByRole("button", { name: "Новый расчёт", exact: true }).click();
  await page
    .getByRole("button", { name: "Начать с пустого списка", exact: true })
    .click();
  await section(page, "Машина");
  await expect(width).toHaveValue(original);
  await expect(
    page.getByText("Примените размеры машины перед расчётом."),
  ).toHaveCount(0);
  await expect(
    page.getByText("Сохранено на устройстве", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: `.cache/ux-new-project-${test.info().project.name}.png`,
    fullPage: true,
  });
});
