import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const authenticate = asyncHandler(async (req, _res, next) => {
  const [scheme, token] = (req.headers.authorization || "").split(" ");
  if (scheme !== "Bearer" || !token)
    throw new AppError(401, "Autenticação necessária.");

  let payload;
  try {
    payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
  } catch {
    throw new AppError(401, "Sessão inválida ou expirada.");
  }

  if (!payload.sid)
    throw new AppError(401, "Sessão antiga. Entre novamente.");

  const session = await prisma.refreshToken.findFirst({
    where: {
      id: payload.sid,
      userId: payload.sub,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      user: {
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          passwordChangedAt: true,
          studentProfile: {
            select: { id: true, accessStatus: true, accessExpiresAt: true },
          },
        },
      },
    },
  });
  const user = session?.user;
  if (!user || user.status !== "ACTIVE")
    throw new AppError(401, "Conta indisponível.");
  if (!session)
    throw new AppError(401, "Sessão encerrada. Entre novamente.");
  if (
    user.passwordChangedAt &&
    payload.iat < Math.floor(user.passwordChangedAt.getTime() / 1000)
  )
    throw new AppError(401, "Sessão encerrada após alteração de senha.");
  if (
    user.studentProfile?.accessStatus === "ACTIVE" &&
    user.studentProfile.accessExpiresAt &&
    user.studentProfile.accessExpiresAt <= new Date()
  ) {
    await prisma.studentProfile.update({
      where: { id: user.studentProfile.id },
      data: { accessStatus: "OVERDUE" },
    });
    user.studentProfile.accessStatus = "OVERDUE";
  }
  req.user = { ...user, studentId: user.studentProfile?.id };
  next();
});

export const authorize =
  (...roles) =>
  (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role))
      return next(new AppError(403, "Você não tem permissão para esta ação."));
    next();
  };

export const requireActiveAccess = (req, _res, next) => {
  if (
    req.user?.role === "STUDENT" &&
    req.user.studentProfile?.accessStatus !== "ACTIVE"
  )
    return next(
      new AppError(
        403,
        "Seu acesso está aguardando confirmação de pagamento. Fale com a equipe Triade FIT.",
      ),
    );
  next();
};
