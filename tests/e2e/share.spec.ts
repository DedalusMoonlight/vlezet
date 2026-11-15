import { test, expect } from "@playwright/test";
test("publishes an immutable snapshot, opens it and deletes it with author secret", async ({
  page,
  browser,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Рассчитать загрузку", exact: true })
    .click();
  await expect(page.getByText("План готов", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Поделиться планом", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Разрешаю создать снимок этих данных").check();
  await dialog
    .getByRole("button", { name: "Создать ссылку", exact: true })
    .click();
  const link = dialog.getByLabel("Ссылка на снимок");
  await expect(link).toHaveValue(/\/s\/[A-Za-z0-9_-]{32}/);
  const url = await link.inputValue();
  const receiver = await browser.newPage();
  await receiver.goto(url);
  await expect(
    receiver.getByText("Размещено 18 коробок · 212 кг"),
  ).toBeVisible();
  await receiver
    .getByRole("button", { name: "3D-инструкция", exact: true })
    .click();
  await expect(
    receiver.getByText("Шаг 1 из 18", { exact: true }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Закрыть публикацию" }).click();
  await page
    .getByLabel(/Обязательный:/)
    .first()
    .uncheck();
  await page
    .getByRole("button", { name: "Поделиться планом", exact: true })
    .click({ timeout: 3000 });
  await expect(
    dialog.getByRole("button", { name: "Создать ссылку", exact: true }),
  ).toBeDisabled();
  await dialog
    .getByRole("button", { name: "Удалить снимок", exact: true })
    .last()
    .click();
  await receiver.reload();
  await expect(receiver.getByRole("alert")).toContainText("удалён");
  await receiver.close();
});
