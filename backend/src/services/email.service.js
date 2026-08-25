import nodemailer from "nodemailer";
import { env } from "../config/env.js";

export async function sendPasswordResetEmail(email, token) {
  if (!env.SMTP_HOST) return false;
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth:
      env.SMTP_USER && env.SMTP_PASS
        ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
        : undefined,
  });
  await transport.sendMail({
    from: env.SMTP_FROM,
    to: email,
    subject: "Recuperação de senha — Triade FIT",
    text: `Seu código de recuperação Triade FIT é: ${token}\n\nEle expira em 1 hora. Se você não solicitou a troca, ignore esta mensagem.`,
    html: `<div style="font-family:Arial,sans-serif;color:#241916"><h2>Recupere seu acesso à Triade FIT</h2><p>Use o código abaixo no aplicativo. Ele expira em 1 hora.</p><p style="padding:16px;background:#f7e4d3;border-radius:12px;font-size:18px"><strong>${token}</strong></p><p>Se você não solicitou a troca, ignore esta mensagem.</p></div>`,
  });
  return true;
}
