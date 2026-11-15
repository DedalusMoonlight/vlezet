import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
export const createToken = () => randomBytes(24).toString("base64url");
export const createSecret = () => randomBytes(32).toString("base64url");
export const hashSecret = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const equalSecret = (secret: string, hash: string) =>
  timingSafeEqual(
    Buffer.from(hashSecret(secret), "hex"),
    Buffer.from(hash, "hex"),
  );
