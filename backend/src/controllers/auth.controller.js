import { env } from "../config/env.js";
import * as auth from "../services/auth.service.js";
import { sendPasswordResetEmail } from "../services/email.service.js";

const meta = (req) => ({ userAgent: req.get("user-agent"), ipAddress: req.ip });
export const register = async (req, res) =>
  res.status(201).json(await auth.registerStudent(req.body, meta(req)));
export const login = async (req, res) =>
  res.json(await auth.login(req.body, meta(req), "STUDENT"));
export const adminLogin = async (req, res) =>
  res.json(await auth.login(req.body, meta(req), "ADMIN"));
export const refresh = async (req, res) =>
  res.json(await auth.refreshSession(req.body.refreshToken, meta(req)));
export const logout = async (req, res) => {
  await auth.logout(req.body.refreshToken);
  res.status(204).end();
};
export const forgot = async (req, res) => {
  const token = await auth.requestPasswordReset(req.body.email);
  if (token) await sendPasswordResetEmail(req.body.email, token);
  res.json({
    message: "Se o e-mail existir, enviaremos as instruções.",
    ...(env.NODE_ENV === "development" && token
      ? { developmentResetToken: token }
      : {}),
  });
};
export const reset = async (req, res) => {
  await auth.resetPassword(req.body.token, req.body.password);
  res.json({ message: "Senha alterada com sucesso." });
};
export const changePassword = async (req, res) => {
  await auth.changePassword(
    req.user.id,
    req.body.currentPassword,
    req.body.newPassword,
  );
  res.json({ message: "Senha alterada. Entre novamente." });
};
