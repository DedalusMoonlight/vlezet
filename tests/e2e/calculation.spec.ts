import { test, expect } from "@playwright/test";
test("calculates a plan on the device without freezing controls", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Рассчитать загрузку", exact: true })
    .click();
  await expect(page.getByRole("status")).toHaveText("План готов", {
    timeout: 15000,
  });
  await expect(page.getByText("Размещено: 18 из 18")).toBeVisible();
});
