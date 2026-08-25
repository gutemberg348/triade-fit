import { z } from "zod";

const password = z
  .string()
  .min(8, "Use pelo menos 8 caracteres.")
  .max(72, "Use no máximo 72 caracteres.")
  .regex(/[A-Za-z]/, "Inclua uma letra.")
  .regex(/[0-9]/, "Inclua um número.");
export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe seu nome completo.")
    .max(100, "Use no máximo 100 caracteres."),
  email: z.email("Informe um e-mail válido."),
  password,
  phone: z.string().trim().max(30, "Use no máximo 30 caracteres.").optional(),
  objective: z.string().trim().max(300, "Use no máximo 300 caracteres.").optional(),
  referralCode: z
    .string()
    .trim()
    .toUpperCase()
    .min(4, "O código precisa ter pelo menos 4 caracteres.")
    .max(30, "Use no máximo 30 caracteres.")
    .optional(),
});
export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});
export const refreshSchema = z.object({ refreshToken: z.string().min(20) });
export const forgotSchema = z.object({ email: z.email() });
export const resetSchema = z.object({ token: z.string().min(20), password });
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: password,
});
