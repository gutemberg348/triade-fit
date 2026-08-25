import crypto from "node:crypto";

export const randomToken = () => crypto.randomBytes(48).toString("hex");
export const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");
