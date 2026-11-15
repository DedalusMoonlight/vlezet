export function updateBlocker(state: {
  running: boolean;
  saveStatus: string;
  editorOpen: boolean;
  dirty: boolean;
  invalid: boolean;
  exporting: boolean;
}): string | null {
  if (state.running || state.exporting)
    return "Дождитесь завершения расчёта или экспорта";
  if (state.editorOpen || state.dirty || state.invalid)
    return "Сначала примените или отмените незавершённые правки и закройте редактор";
  if (
    !["Сохранено на устройстве", "Демонстрационный проект"].includes(
      state.saveStatus,
    )
  )
    return "Дождитесь сохранения проекта. При ошибке скачайте JSON и перезапустите приложение вручную.";
  return null;
}
