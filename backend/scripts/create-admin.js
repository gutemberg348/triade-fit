import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/config/prisma.js";

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const name = process.env.ADMIN_NAME?.trim() || "Admin Triade FIT";

if (!email || !password) {
  throw new Error(
    "Defina ADMIN_EMAIL e ADMIN_PASSWORD antes de executar admin:create.",
  );
}

if (password.length < 12) {
  throw new Error("ADMIN_PASSWORD deve ter pelo menos 12 caracteres.");
}

try {
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { role: "ADMIN", status: "ACTIVE" },
    });
    console.log(`Usuário ${email} promovido para ADMIN sem alterar a senha.`);
  } else {
    await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: await bcrypt.hash(password, 12),
        role: "ADMIN",
        status: "ACTIVE",
      },
    });
    console.log(`Administrador ${email} criado com sucesso.`);
  }
} finally {
  await prisma.$disconnect();
}
