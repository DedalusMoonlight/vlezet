import { nativeApp } from "../../platform/runtime";
import { useState } from "react";
import { useProject } from "../project/store";
import { db } from "../../storage/db";
import { publishSnapshot, deleteSnapshot } from "./client";
import { download } from "../import/download";
export function ShareDialog() {
  const { input, currentSolution } = useProject();
  const [open, setOpen] = useState(false);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    token: string;
    deleteSecret: string;
    expiresAt: number;
  } | null>(null);
  const [history, setHistory] = useState<
    { token: string; secret: string; expiresAt: number }[]
  >([]);
  const load = async () => {
    try {
      setHistory(await db.secrets.toArray());
    } catch {
      setError(
        "Хранилище секретов недоступно. Скачайте секрет удаления после публикации.",
      );
    }
  };
  const publish = async () => {
    if (nativeApp()) return;
    if (
      !currentSolution ||
      currentSolution.status !== "ready" ||
      !agree ||
      busy
    )
      return;
    setBusy(true);
    setError("");
    try {
      const r = await publishSnapshot(input, currentSolution);
      setResult(r);
      try {
        await db.secrets.put({
          token: r.token,
          secret: r.deleteSecret,
          expiresAt: r.expiresAt,
        });
        await load();
      } catch {
        setError(
          "Ссылка создана, но секрет не сохранился на устройстве. Скачайте секрет удаления.",
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка публикации");
    } finally {
      setBusy(false);
    }
  };
  const remove = async (token: string, secret: string) => {
    try {
      await deleteSnapshot(token, secret);
      await db.secrets.delete(token);
      if (result?.token === token) setResult(null);
      await load();
      setError("Снимок удалён");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка удаления");
    }
  };
  const link = result ? `${location.origin}/s/${result.token}` : "";
  return (
    <>
      <button
        onClick={() => {
          setOpen(true);
          void load();
        }}
      >
        Поделиться планом
      </button>
      {open && (
        <div className="modal-backdrop">
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Поделиться планом"
            className="modal"
          >
            <div className="section-head">
              <h2>План по ссылке</h2>
              <button
                aria-label="Закрыть публикацию"
                onClick={() => setOpen(false)}
              >
                ×
              </button>
            </div>
            {nativeApp() && (
              <p role="status">
                Обмен по ссылке появится после подключения сервера. Сейчас
                сохраните JSON и отправьте файл получателю.
              </p>
            )}
            <p>
              Снимок доступен любому, у кого есть ссылка, 30 дней. В него входят
              названия, размеры груза и раскладка. Изменения вашего проекта не
              обновляют снимок.
            </p>
            <label className="check">
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
              />
              Разрешаю создать снимок этих данных
            </label>
            <button
              className="primary"
              disabled={
                nativeApp() ||
                !agree ||
                busy ||
                currentSolution?.status !== "ready"
              }
              onClick={() => void publish()}
            >
              {busy ? "Создаём…" : "Создать ссылку"}
            </button>
            {currentSolution?.status !== "ready" && (
              <p className="hint">
                Для новой ссылки сначала рассчитайте план. Старые снимки можно
                удалить ниже.
              </p>
            )}
            {result && (
              <>
                <label>
                  Ссылка на снимок
                  <input
                    readOnly
                    value={link}
                    onFocus={(e) => e.target.select()}
                  />
                </label>
                <div className="actions">
                  <button
                    onClick={() =>
                      void navigator.clipboard
                        .writeText(link)
                        .catch(() =>
                          setError("Выделите ссылку и скопируйте вручную"),
                        )
                    }
                  >
                    Скопировать ссылку
                  </button>
                  <button
                    onClick={() =>
                      download(
                        new TextEncoder().encode(
                          JSON.stringify({
                            token: result.token,
                            deleteSecret: result.deleteSecret,
                            expiresAt: result.expiresAt,
                          }),
                        ),
                        "vlezet-delete-secret.json",
                        "application/json",
                      ).catch((e) =>
                        setError(
                          e instanceof Error ? e.message : "Ошибка экспорта",
                        ),
                      )
                    }
                  >
                    Скачать секрет удаления
                  </button>
                </div>
              </>
            )}
            {history.length > 0 && (
              <details open>
                <summary>Мои снимки на этом устройстве</summary>
                {history.map((h) => (
                  <div className="snapshot-row" key={h.token}>
                    <a href={`/s/${h.token}`} target="_blank" rel="noreferrer">
                      Снимок до {new Date(h.expiresAt).toLocaleDateString("ru")}
                    </a>
                    <button onClick={() => void remove(h.token, h.secret)}>
                      Удалить снимок
                    </button>
                  </div>
                ))}
              </details>
            )}
            {error && <p role="alert">{error}</p>}
          </section>
        </div>
      )}
    </>
  );
}
