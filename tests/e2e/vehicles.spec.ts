import { test, expect } from "@playwright/test";

test("a vehicle preset never inherits available payload from another vehicle", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("combobox", { name: "Машина", exact: true })
    .selectOption("custom-l1");
  const mass = page.getByRole("textbox", {
    name: "Доступная грузоподъёмность, кг",
    exact: true,
  });
  await expect(mass).toHaveValue("");
  await page.getByRole("checkbox", { name: /Подтверждаю размеры/ }).check();
  await page
    .getByRole("button", { name: "Применить размеры", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Рассчитать загрузку", exact: true }),
  ).toBeDisabled();
  await mass.fill("450");
  await page.getByRole("checkbox", { name: /Подтверждаю размеры/ }).check();
  await page
    .getByRole("button", { name: "Применить размеры", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Рассчитать загрузку", exact: true }),
  ).toBeEnabled();
});

test("Largus asks for unverified measurements and confirmation cannot bypass them", async ({
  page,
}) => {
  await page.goto("/");
  const vehicle = page.getByRole("combobox", { name: "Машина", exact: true });
  await vehicle.selectOption("largus-van");
  const length = page.getByRole("textbox", { name: "Длина, см", exact: true });
  const width = page.getByRole("textbox", { name: "Ширина, см", exact: true });
  const height = page.getByRole("textbox", { name: "Высота, см", exact: true });
  const mass = page.getByRole("textbox", {
    name: "Доступная грузоподъёмность, кг",
    exact: true,
  });
  const confirmation = page.getByRole("checkbox", {
    name: /Подтверждаю размеры/,
  });
  const calculate = page.getByRole("button", {
    name: "Рассчитать загрузку",
    exact: true,
  });
  await expect(length).toHaveValue("194");
  await expect(width).toHaveValue("");
  await expect(height).toHaveValue("");
  await expect(page.getByText(/Не все размеры подтверждены/)).toBeVisible();
  await mass.fill("400");
  await confirmation.check();
  await page
    .getByRole("button", { name: "Применить размеры", exact: true })
    .click();
  await expect(calculate).toBeDisabled();
  await width.fill("95");
  await height.fill("90");
  await confirmation.check();
  await page
    .getByRole("button", { name: "Применить размеры", exact: true })
    .click();
  await expect(calculate).toBeEnabled();
  await calculate.click();
  await expect(
    page.getByRole("region", { name: "Результат расчёта" }),
  ).toContainText(/из\s*400\s*кг/);
});

test("minivan seat configurations and source are explicit on a narrow screen", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const vehicle = page.getByRole("combobox", { name: "Машина", exact: true });
  const length = page.getByRole("textbox", { name: "Длина, см", exact: true });
  await vehicle.selectOption("caddy5-maxi-2");
  await expect(length).toHaveValue("226.5");
  await page.getByText("Размеры и источник", { exact: true }).click();
  await expect(
    page.getByText(/Второй и третий ряды сняты полностью/),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Источник производителя", exact: true }),
  ).toHaveAttribute("href", /Dimension-Drawings-Caddy_Life.pdf$/);
  await vehicle.selectOption("caddy5-maxi-5");
  await expect(length).toHaveValue("145.2");
  await expect(
    page.getByText(/Второй ряд установлен, третий снят/),
  ).toBeVisible();
  await length.fill("140");
  await vehicle.selectOption("");
  await expect(length).toHaveValue("140");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
});

test("changing from an incomplete preset resets invalid dimension drafts but not invalid gaps", async ({
  page,
}) => {
  await page.goto("/");
  const vehicle = page.getByRole("combobox", { name: "Машина", exact: true });
  await vehicle.selectOption("largus-van");
  await page
    .getByRole("textbox", { name: "Ширина, см", exact: true })
    .fill("wrong");
  await page.getByText("Зазоры и точность", { exact: true }).click();
  const gap = page.getByRole("textbox", {
    name: "До стен и потолка, мм",
    exact: true,
  });
  await gap.fill("");
  await vehicle.selectOption("dokker-van");
  await expect(
    page.getByRole("textbox", { name: "Ширина, см", exact: true }),
  ).toHaveValue("108.2");
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
  await expect(
    page.getByRole("button", { name: "Рассчитать загрузку", exact: true }),
  ).toBeDisabled();
  await gap.fill("10");
  await page
    .getByRole("button", { name: "Применить размеры", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Рассчитать загрузку", exact: true }),
  ).toBeEnabled();
});
