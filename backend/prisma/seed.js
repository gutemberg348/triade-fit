import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const homeCoverUrl = "/brand/triade-fit-home.png";
const focusCoverUrl = "/brand/triade-fit-focus.png";
const balanceCoverUrl = "/brand/triade-fit-balance.png";

async function main() {
  await prisma.notification.deleteMany();
  await prisma.communityPost.deleteMany();
  await prisma.announcementRecipient.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.progressPhoto.deleteMany();
  await prisma.bodyMeasurement.deleteMany();
  await prisma.lessonProgress.deleteMany();
  await prisma.studentProgram.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.module.deleteMany();
  await prisma.program.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.partnerLedgerEntry.deleteMany();
  await prisma.referral.deleteMany();
  await prisma.partnerProfile.deleteMany();
  await prisma.studentProfile.deleteMany();
  await prisma.user.deleteMany();

  const admin = await prisma.user.create({
    data: {
      name: "Marina Triade",
      email: (process.env.ADMIN_EMAIL || "personal@essenza.com").toLowerCase(),
      passwordHash: await bcrypt.hash(
        process.env.ADMIN_PASSWORD || "Essenza@2026",
        12,
      ),
      role: "ADMIN",
    },
  });
  const student = await prisma.user.create({
    data: {
      name: "Alcione Souza",
      email: "aluna@essenza.com",
      passwordHash: await bcrypt.hash("Essenza@2026", 12),
      role: "STUDENT",
      phone: "(11) 99999-1234",
      birthDate: new Date("1992-04-17"),
      studentProfile: {
        create: {
          accessStatus: "ACTIVE",
          objective: "Ganhar força, disposição e reduzir medidas",
          initialHeightCm: 165,
        },
      },
    },
    include: { studentProfile: true },
  });

  const program = await prisma.program.create({
    data: {
      title: "Projeto Triade FIT",
      description:
        "Um programa progressivo de movimento, força e hábitos para transformar sua rotina com consistência.",
      coverUrl: homeCoverUrl,
      sortOrder: 0,
      status: "PUBLISHED",
      modules: {
        create: [
          {
            title: "Comece por aqui",
            description:
              "Prepare o corpo e entenda como aproveitar sua jornada.",
            coverUrl: focusCoverUrl,
            sortOrder: 0,
            status: "PUBLISHED",
            lessons: {
              create: [
                {
                  title: "Boas-vindas à sua jornada",
                  description:
                    "Conheça o método e organize seu espaço de treino.",
                  instructions:
                    "Separe água, uma toalha e um local confortável.",
                  durationMinutes: 8,
                  category: "Introdução",
                  difficulty: "Iniciante",
                  calories: 35,
                  sortOrder: 0,
                  status: "PUBLISHED",
                  videoUrl: "https://www.youtube.com/watch?v=inpok4MKVLM",
                },
                {
                  title: "Mobilidade essencial",
                  description:
                    "Uma sequência leve para preparar articulações e músculos.",
                  instructions:
                    "Faça os movimentos sem dor e respeite sua amplitude.",
                  durationMinutes: 12,
                  category: "Mobilidade",
                  difficulty: "Iniciante",
                  calories: 65,
                  sortOrder: 1,
                  status: "PUBLISHED",
                },
                {
                  title: "Ativação e respiração",
                  description: "Conecte respiração, postura e centro do corpo.",
                  durationMinutes: 10,
                  category: "Preparação",
                  difficulty: "Iniciante",
                  calories: 45,
                  sortOrder: 2,
                  status: "PUBLISHED",
                },
              ],
            },
          },
          {
            title: "Força de membros inferiores",
            description: "Treinos de pernas e glúteos com progressão segura.",
            coverUrl: homeCoverUrl,
            sortOrder: 1,
            status: "PUBLISHED",
            lessons: {
              create: [
                {
                  title: "Pernas: base e controle",
                  description:
                    "Agachamentos e variações para construir uma base forte.",
                  instructions: "3 séries; descanse de 45 a 60 segundos.",
                  durationMinutes: 28,
                  category: "Pernas",
                  difficulty: "Intermediário",
                  calories: 280,
                  sortOrder: 0,
                  status: "PUBLISHED",
                },
                {
                  title: "Glúteos em foco",
                  description: "Ativação e força com movimentos eficientes.",
                  instructions:
                    "Mantenha o abdômen ativo durante toda a execução.",
                  durationMinutes: 24,
                  category: "Glúteos",
                  difficulty: "Intermediário",
                  calories: 240,
                  sortOrder: 1,
                  status: "PUBLISHED",
                },
                {
                  title: "Core funcional",
                  description:
                    "Estabilidade para proteger a lombar e melhorar o treino.",
                  durationMinutes: 18,
                  category: "Abdômen",
                  difficulty: "Intermediário",
                  calories: 160,
                  sortOrder: 2,
                  status: "PUBLISHED",
                },
              ],
            },
          },
          {
            title: "Sua melhor versão",
            description:
              "Consolide a rotina com treinos completos e autonomia.",
            coverUrl: focusCoverUrl,
            sortOrder: 2,
            status: "PUBLISHED",
            lessons: {
              create: [
                {
                  title: "Full body Triade FIT",
                  description:
                    "Treino completo para força, mobilidade e energia.",
                  durationMinutes: 35,
                  category: "Corpo inteiro",
                  difficulty: "Avançado",
                  calories: 390,
                  sortOrder: 0,
                  status: "PUBLISHED",
                },
                {
                  title: "Recuperação consciente",
                  description:
                    "Alongamento e respiração para recuperar melhor.",
                  durationMinutes: 15,
                  category: "Recuperação",
                  difficulty: "Todos os níveis",
                  calories: 70,
                  sortOrder: 1,
                  status: "PUBLISHED",
                },
              ],
            },
          },
          {
            title: "Respire e reconecte",
            description:
              "Práticas guiadas para acalmar a mente, melhorar o foco e recuperar o corpo.",
            coverUrl: balanceCoverUrl,
            sortOrder: 3,
            status: "PUBLISHED",
            lessons: {
              create: [
                {
                  title: "Respiração e presença",
                  description:
                    "Uma pausa guiada para reduzir a ansiedade e voltar ao momento presente.",
                  instructions:
                    "Sente-se confortavelmente, relaxe os ombros e acompanhe o tempo da prática.",
                  durationMinutes: 10,
                  category: "Conexão interior",
                  kind: "MEDITATION",
                  showMeditationButton: true,
                  difficulty: "Todos os níveis",
                  calories: 0,
                  sortOrder: 0,
                  status: "PUBLISHED",
                },
                {
                  title: "Relaxamento pós-treino",
                  description:
                    "Respiração lenta e atenção corporal para uma recuperação consciente.",
                  durationMinutes: 8,
                  category: "Recuperação",
                  kind: "MEDITATION",
                  showMeditationButton: true,
                  difficulty: "Todos os níveis",
                  calories: 0,
                  sortOrder: 1,
                  status: "PUBLISHED",
                },
              ],
            },
          },
        ],
      },
    },
    include: { modules: { include: { lessons: true } } },
  });

  await prisma.studentProgram.create({
    data: { studentId: student.studentProfile.id, programId: program.id },
  });
  const completedLessons = program.modules[0].lessons.slice(0, 2);
  await prisma.lessonProgress.createMany({
    data: completedLessons.map((lesson, index) => ({
      studentId: student.studentProfile.id,
      lessonId: lesson.id,
      completed: true,
      completedAt: new Date(Date.now() - (index + 1) * 86400000),
      lastViewedAt: new Date(),
    })),
  });
  await prisma.bodyMeasurement.createMany({
    data: [
      {
        studentId: student.studentProfile.id,
        recordedById: admin.id,
        measuredAt: new Date("2026-06-10"),
        weightKg: 78,
        heightCm: 165,
        bmi: 28.65,
        bodyFatPercent: 33.2,
        waistCm: 90,
        abdomenCm: 96,
        hipsCm: 107,
        chestCm: 94,
        rightArmCm: 31,
        leftArmCm: 30.5,
        rightThighCm: 61,
        leftThighCm: 60.5,
        rightCalfCm: 38,
        leftCalfCm: 37.5,
      },
      {
        studentId: student.studentProfile.id,
        recordedById: admin.id,
        measuredAt: new Date("2026-07-10"),
        weightKg: 75.1,
        heightCm: 165,
        bmi: 27.58,
        bodyFatPercent: 31.4,
        waistCm: 86,
        abdomenCm: 92,
        hipsCm: 104,
      },
      {
        studentId: student.studentProfile.id,
        recordedById: admin.id,
        measuredAt: new Date("2026-08-10"),
        weightKg: 72.4,
        heightCm: 165,
        bmi: 26.59,
        bodyFatPercent: 29.8,
        waistCm: 82,
        abdomenCm: 88,
        hipsCm: 101,
      },
    ],
  });

  const announcement = await prisma.announcement.create({
    data: {
      createdById: admin.id,
      title: "Uma nova semana para evoluir",
      message:
        "Seu próximo treino já está disponível. Lembre-se: consistência vale mais que perfeição.",
      audience: "ALL",
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
  });
  await prisma.notification.create({
    data: {
      userId: student.id,
      announcementId: announcement.id,
      title: announcement.title,
      message: announcement.message,
    },
  });
  await prisma.communityPost.create({
    data: {
      createdById: admin.id,
      authorName: "Equipe Triade FIT",
      message:
        "Não é sobre motivação todos os dias. É sobre compromisso, cuidado e constância. Compartilhe sua evolução com a comunidade!",
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
  });
  console.log("Seed concluído.");
  console.log("Admin: personal@essenza.com / Essenza@2026");
  console.log("Aluna: aluna@essenza.com / Essenza@2026");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
