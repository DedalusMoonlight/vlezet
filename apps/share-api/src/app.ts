import Fastify from "fastify";
import rateLimit from "@fastify/rate-limit";
import { SnapshotRepository } from "./repository";
import { canonicalSnapshot } from "./schemas";
import { createToken, createSecret, hashSecret, equalSecret } from "./tokens";
export async function buildApp(
  options: {
    filename?: string;
    now?: () => number;
    publishLimit?: number;
    trustProxy?: boolean;
  } = {},
) {
  const app = Fastify({
    logger: false,
    bodyLimit: 1024 * 1024,
    trustProxy: options.trustProxy ?? false,
  });
  const repo = new SnapshotRepository(options.filename ?? "snapshots.sqlite");
  const now = options.now ?? Date.now;
  await app.register(rateLimit, { global: false });
  app.addHook("onSend", async (_req, reply, payload) => {
    reply
      .header("cache-control", "no-store")
      .header("referrer-policy", "no-referrer")
      .header("x-robots-tag", "noindex, nofollow");
    return payload;
  });
  app.setErrorHandler((error, _req, reply) => {
    const status = error && typeof error === "object" && "statusCode" in error ? Number(error.statusCode) || 500 : 500;
    reply
      .code(status)
      .send({
        error:
          status === 413
            ? "Снимок больше 1 МиБ"
            : status === 429
              ? "Лимит публикаций. Попробуйте позже."
              : "Ошибка сервиса снимков",
      });
  });
  app.post(
    "/api/snapshots",
    {
      config: {
        rateLimit: { max: options.publishLimit ?? 10, timeWindow: "1 hour" },
      },
    },
    async (req, reply) => {
      let snapshot;
      try {
        snapshot = canonicalSnapshot(req.body);
      } catch {
        return reply
          .code(400)
          .send({
            error:
              "Нужен текущий проверенный план со всеми обязательными грузами",
          });
      }
      const body = JSON.stringify(snapshot);
      if (Buffer.byteLength(body) > 1024 * 1024)
        return reply.code(413).send({ error: "Снимок больше 1 МиБ" });
      const token = createToken(),
        deleteSecret = createSecret(),
        expiresAt = now() + 30 * 86400000;
      repo.insert({
        token,
        secret_hash: hashSecret(deleteSecret),
        body,
        expires_at: expiresAt,
      });
      return reply.code(201).send({ token, deleteSecret, expiresAt });
    },
  );
  app.get<{ Params: { token: string } }>(
    "/api/snapshots/:token",
    async (req, reply) => {
      const token = req.params.token;
      if (!/^[\w-]{32}$/.test(token))
        return reply.code(404).send({ error: "Снимок не найден" });
      const row = repo.get(token);
      if (!row || row.expires_at <= now()) {
        if (row) repo.delete(token);
        return reply
          .code(404)
          .send({ error: "Снимок удалён или срок ссылки истёк" });
      }
      return JSON.parse(row.body);
    },
  );
  app.delete<{ Params: { token: string } }>(
    "/api/snapshots/:token",
    async (req, reply) => {
      const token = req.params.token;
      const row = /^[\w-]{32}$/.test(token) ? repo.get(token) : undefined;
      if (!row || row.expires_at <= now())
        return reply.code(404).send({ error: "Снимок не найден" });
      const secret = req.headers.authorization?.replace(/^Bearer /, "") ?? "";
      if (!equalSecret(secret, row.secret_hash))
        return reply.code(403).send({ error: "Неверный секрет удаления" });
      repo.delete(token);
      return reply.code(204).send();
    },
  );
  repo.expire(now());
  const timer = setInterval(() => repo.expire(now()), 86400000);
  timer.unref();
  app.addHook("onClose", async () => {
    clearInterval(timer);
    repo.close();
  });
  app.get("/api/health", async () => ({ ok: true }));
  await app.ready();
  return app;
}
