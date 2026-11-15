import { useEffect, useState } from "react";
import { nativeApp } from "./platform/runtime";
import { useProject } from "./features/project/store";
import { updateBlocker } from "./updateGuard";
export function PwaStatus({ saveStatus }: { saveStatus: string }) {
  const [offline, setOffline] = useState(false);
  const [refresh, setRefresh] = useState(false);
  const [update, setUpdate] = useState<null | (() => void)>(null);
  const [message, setMessage] = useState("");
  const running = useProject((s) => s.status === "running");
  useEffect(() => {
    if (
      nativeApp() ||
      !window.isSecureContext ||
      import.meta.env.MODE === "android"
    )
      return;
    void import("virtual:pwa-register").then(({ registerSW }) => {
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
    });
  }, []);
  if (nativeApp())
    return (
      <div className="pwa-status">
        Android · Работает офлайн · Обновления — установкой нового APK
      </div>
    );
  return (
    <div className="pwa-status">
      <span>
        {offline
          ? "Доступно офлайн"
          : !window.isSecureContext
            ? "Просмотр по Wi-Fi · установка и офлайн доступны по HTTPS"
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
