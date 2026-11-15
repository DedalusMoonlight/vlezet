import { buildApp } from "./app";
const app = await buildApp({
  filename: process.env.DATABASE_PATH ?? "snapshots.sqlite",
  publishLimit: Number(process.env.PUBLISH_LIMIT ?? 10),
  trustProxy: process.env.TRUST_PROXY === "true",
});
await app.listen({
  port: Number(process.env.PORT ?? 3001),
  host: process.env.HOST ?? "127.0.0.1",
});
console.log("Сервис снимков запущен. Access logs отключены.");
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => void app.close().then(() => process.exit(0)));
