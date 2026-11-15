import { useEffect, useState } from "react";
import { registerSW } from "virtual:pwa-register";
import { useProject } from "./features/project/store";
import { updateBlocker } from "./updateGuard";
export function PwaStatus({ saveStatus }: { saveStatus: string }) {
  const [offline, setOffline] = useState(false);
  const [refresh, setRefresh] = useState(false);
  const [update, setUpdate] = useState<null | (() => void)>(null);
  const [message, setMessage] = useState("");
  const running = useProject((s) => s.status === "running");
  useEffect(() => {
    const reload = registerSW({
      onOfflineReady: () => setOffline(true),
      onNeedRefresh: () => setRefresh(true),
      onRegisteredSW: () => {
        void navigator.serviceWorker.ready.then(() => setOffline(true));
      },
      onRegisterError: () => setMessage("Офлайн-кеш пока недоступен"),
    });
    setUpdate(() => () => {
      void reload(true);
    });
  }, []);
  return (
    <div className="pwa-status">
      <span>
        {offline
          ? "Доступно офлайн"
          : import.meta.env.DEV
            ? "Режим разработки"
            : "Готовим офлайн-кеш…"}
      </span>
      {refresh && (
        <button
          disabled={running}
          onClick={() => {
            const blocker = updateBlocker({
              running,
              saveStatus,
              editorOpen: !!document.querySelector('[role="dialog"]'),
              dirty: !!document.querySelector('[data-unsaved="true"]'),
              invalid: !!document.querySelector('[aria-invalid="true"]'),
              exporting: !!document.querySelector('[data-exporting="true"]'),
            });
            if (blocker) setMessage(blocker);
            else update?.();
          }}
        >
          Обновить приложение
        </button>
      )}
      {message && <span>{message}</span>}
      <details>
        <summary>Установить на телефон</summary>
        <p>
          Android: меню браузера → «Установить приложение». iPhone: Safari →
          «Поделиться» → «На экран Домой». Откройте приложение онлайн один раз и
          дождитесь статуса «Доступно офлайн».
        </p>
      </details>
    </div>
  );
}
