import { fileURLToPath } from "node:url";
export const aliases = Object.fromEntries(
  ["domain", "validation", "packing", "io"].map((name) => [
    `@vlezet/${name}`,
    fileURLToPath(new URL(`./packages/${name}/src/index.ts`, import.meta.url)),
  ]),
);
