import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";
import { hashToken, randomToken } from "../utils/crypto.js";
import { publicUserSelect } from "../utils/selects.js";

const accessToken = (user, sessionId) =>
  jwt.sign({ role: user.role, sid: sessionId }, env.JWT_ACCESS_SECRET, {
    subject: user.id,
    expiresIn: env.ACCESS_TOKEN_TTL,
  });
const refreshExpiry = () =>
  new Date(Date.now() + env.REFRESH_TOKEN_DAYS * 86400000);

async function issueSession(user, meta = {}) {
  const refreshToken = randomToken();
  const session = await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: refreshExpiry(),
      ...meta,
    },
  });
  return { accessToken: accessToken(user, session.id), refreshToken, user };
}

export async function registerStudent(data, meta) {
  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash,
        name: data.name,
        phone: data.phone,
        role: "STUDENT",
        studentProfile: { create: { objective: data.objective } },
      },
      select: publicUserSelect,
    });
    const programs = await tx.program.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true },
    });
    if (programs.length && created.studentProfile) {
      await tx.studentProgram.createMany({
        data: programs.map((program) => ({
          studentId: created.studentProfile.id,
          programId: program.id,
        })),
        skipDuplicates: true,
      });
    }
    if (data.referralCode && created.studentProfile) {
      const partner = await tx.partnerProfile.findFirst({
        where: { referralCode: data.referralCode, active: true },
      });
      if (!partner) throw new AppError(422, "Código de indicação inválido.");
      await tx.referral.create({
        data: {
          partnerId: partner.id,
          studentId: created.studentProfile.id,
          creditCents: partner.defaultCreditCents,
        },
      });
    }
    return created;
  });
  return issueSession(user, meta);
}

export async function login(data, meta, requiredRole) {
  const found = await prisma.user.findUnique({
    where: { email: data.email.toLowerCase() },
  });
  const valid =
    found && (await bcrypt.compare(data.password, found.passwordHash));
  if (!valid || (requiredRole && found.role !== requiredRole))
    throw new AppError(401, "E-mail ou senha inválidos.");
  if (found.status !== "ACTIVE")
    throw new AppError(403, "Esta conta está inativa.");
  await prisma.user.update({
    where: { id: found.id },
    data: { lastLoginAt: new Date() },
  });
  const user = await prisma.user.findUnique({
    where: { id: found.id },
    select: publicUserSelect,
  });
  return issueSession(user, meta);
}

export async function refreshSession(rawToken, meta) {
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    include: { user: true },
  });
  if (
    !stored ||
    stored.revokedAt ||
    stored.expiresAt <= new Date() ||
    stored.user.status !== "ACTIVE"
  )
    throw new AppError(401, "Refresh token inválido.");
  const user = await prisma.user.findUnique({
    where: { id: stored.userId },
    select: publicUserSelect,
  });
  return prisma.$transaction(async (tx) => {
    await tx.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    const refreshToken = randomToken();
    const session = await tx.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: refreshExpiry(),
        ...meta,
      },
    });
    return {
      accessToken: accessToken(user, session.id),
      refreshToken,
      user,
    };
  });
}

export async function logout(rawToken) {
  if (!rawToken) return;
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(rawToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function requestPasswordReset(email) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (!user) return null;
  const token = randomToken();
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 3600000),
    },
  });
  return token;
}

export async function resetPassword(token, password) {
  const stored = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!stored || stored.usedAt || stored.expiresAt <= new Date())
    throw new AppError(400, "Token de recuperação inválido ou expirado.");
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: stored.userId },
      data: { passwordHash, passwordChangedAt: new Date() },
    }),
    prisma.passwordResetToken.update({
      where: { id: stored.id },
      data: { usedAt: new Date() },
    }),
    prisma.refreshToken.updateMany({
      where: { userId: stored.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
}

export async function changePassword(userId, currentPassword, newPassword) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!(await bcrypt.compare(currentPassword, user.passwordHash)))
    throw new AppError(400, "Senha atual incorreta.");
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { passwordHash, passwordChangedAt: new Date() },
    }),
    prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
}
