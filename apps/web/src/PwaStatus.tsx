import { useEffect, useState } from "react";
import { registerSW } from "virtual:pwa-register";
import { useProject } from "./features/project/store";
export function PwaStatus() {
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
      if (document.querySelector('[role="dialog"]')) {
        setMessage("Сначала сохраните и закройте открытый редактор");
        return;
      }
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
        <button disabled={running} onClick={() => update?.()}>
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
