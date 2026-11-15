import { expect, it } from "vitest";
import { updateBlocker } from "./updateGuard";
const idle = {
  running: false,
  saveStatus: "Сохранено на устройстве",
  editorOpen: false,
  dirty: false,
  invalid: false,
  exporting: false,
};
it("allows updates only after drafts, writes and active jobs finish", () => {
  expect(updateBlocker(idle)).toBeNull();
  expect(
    updateBlocker({ ...idle, saveStatus: "Демонстрационный проект" }),
  ).toBeNull();
  for (const flag of [
    "running",
    "editorOpen",
    "dirty",
    "invalid",
    "exporting",
  ] as const)
    expect(updateBlocker({ ...idle, [flag]: true })).not.toBeNull();
  for (const saveStatus of [
    "Сохраняем…",
    "Не удалось сохранить. Скачайте JSON-копию.",
  ])
    expect(updateBlocker({ ...idle, saveStatus })).not.toBeNull();
});
