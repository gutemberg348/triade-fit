import "dotenv/config";
import { z } from "zod";

const optionalSecret = (min = 1) =>
  z.preprocess(
    (value) => (typeof value === "string" && !value.trim() ? undefined : value),
    z.string().min(min).optional(),
  );

const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3333),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_DAYS: z.coerce.number().int().positive().default(30),
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:5173,http://localhost:5174,http://localhost:8081"),
  PUBLIC_BASE_URL: z.url().optional(),
  ASAAS_API_KEY: optionalSecret(),
  ASAAS_ENV: z.enum(["sandbox", "production"]).default("sandbox"),
  ASAAS_WEBHOOK_TOKEN: optionalSecret(32),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default("Triade FIT <nao-responda@essenza.com>"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error(
    "Variáveis de ambiente inválidas:",
    z.treeifyError(parsed.error),
  );
  process.exit(1);
}

export const env = {
  ...parsed.data,
  corsOrigins: parsed.data.CORS_ORIGINS.split(",").map((origin) =>
    origin.trim(),
  ),
};
