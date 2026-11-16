import type { Page } from "@playwright/test";
export async function section(page: Page, name: "Машина" | "Груз" | "План") {
  const navigation = page.getByRole("navigation", { name: "Разделы проекта" });
  if (await navigation.isVisible()) {
    const menu = page.locator("details.file-menu");
    if ((await menu.getAttribute("open")) !== null)
      await menu.getByText("Файлы и обмен", { exact: true }).click();
  }
  if (await navigation.isVisible())
    await navigation.getByRole("button", { name, exact: true }).click();
}
export async function files(page: Page) {
  const menu = page.locator("details.file-menu");
  if (!(await menu.getAttribute("open"))) {
    if ((await menu.getAttribute("open")) === null)
      await menu.getByText("Файлы и обмен", { exact: true }).click();
  }
}
