import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";

const lessonCount = (program) =>
  program.modules.reduce((total, module) => total + module.lessons.length, 0);
const completedCount = (program) =>
  program.modules.reduce(
    (total, module) =>
      total +
      module.lessons.filter((lesson) => lesson.progress?.[0]?.completed).length,
    0,
  );

const availabilityFor = (lessons, index, now = new Date()) => {
  const lesson = lessons[index];
  if (lesson.progress?.[0]?.completed || index === 0)
    return { isLocked: false, unlocksAt: null, reason: null };

  const previous = lessons[index - 1];
  const previousProgress = previous.progress?.[0];
  if (!previousProgress?.completed)
    return {
      isLocked: true,
      unlocksAt: null,
      reason: "Conclua o capítulo anterior para liberar este conteúdo.",
    };

  const delayHours = lesson.unlockDelayHours || 0;
  if (!delayHours || !previousProgress.completedAt)
    return { isLocked: false, unlocksAt: null, reason: null };

  const unlocksAt = new Date(
    new Date(previousProgress.completedAt).getTime() + delayHours * 60 * 60 * 1000,
  );
  if (unlocksAt <= now)
    return { isLocked: false, unlocksAt: unlocksAt.toISOString(), reason: null };
  return {
    isLocked: true,
    unlocksAt: unlocksAt.toISOString(),
    reason: "Este capítulo será liberado após o intervalo definido pela Personal.",
  };
};

export function withSequentialAvailability(program, now = new Date()) {
  const lessons = program.modules.flatMap((module) => module.lessons);
  const availability = new Map(
    lessons.map((lesson, index) => [lesson.id, availabilityFor(lessons, index, now)]),
  );
  return {
    ...program,
    modules: program.modules.map((module) => ({
      ...module,
      lessons: module.lessons.map((lesson) => ({
        ...lesson,
        availability: availability.get(lesson.id),
      })),
    })),
  };
}

export function withProgramProgress(program) {
  program = withSequentialAvailability(program);
  const totalLessons = lessonCount(program);
  const completedLessons = completedCount(program);
  return {
    ...program,
    totalLessons,
    completedLessons,
    progressPercent: totalLessons
      ? Math.round((completedLessons / totalLessons) * 100)
      : 0,
    modules: program.modules.map((module) => {
      const completed = module.lessons.filter(
        (lesson) => lesson.progress?.[0]?.completed,
      ).length;
      return {
        ...module,
        completedLessons: completed,
        totalLessons: module.lessons.length,
        progressPercent: module.lessons.length
          ? Math.round((completed / module.lessons.length) * 100)
          : 0,
      };
    }),
  };
}

export async function requireEnrolledLesson(studentId, lessonId) {
  const lesson = await prisma.lesson.findFirst({
    where: {
      id: lessonId,
      status: "PUBLISHED",
      module: {
        status: "PUBLISHED",
        program: {
          status: "PUBLISHED",
          enrollments: { some: { studentId, status: "ACTIVE" } },
        },
      },
    },
    include: {
      module: {
        include: {
          program: { select: { id: true, title: true } },
        },
      },
      progress: {
        where: { studentId },
        select: { completed: true, completedAt: true, lastViewedAt: true },
      },
    },
  });
  if (!lesson) throw new AppError(404, "Aula não encontrada ou indisponível.");
  const modules = await prisma.module.findMany({
    where: {
      programId: lesson.module.program.id,
      status: "PUBLISHED",
    },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      title: true,
      sortOrder: true,
      lessons: {
        where: { status: "PUBLISHED" },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          title: true,
          sortOrder: true,
          unlockDelayHours: true,
          progress: {
            where: { studentId },
            select: { completed: true, completedAt: true },
          },
        },
      },
    },
  });
  const sequenced = withSequentialAvailability({ modules });
  const lessons = sequenced.modules.flatMap((module) => module.lessons);
  const current = lessons.find((item) => item.id === lesson.id);
  if (current?.availability?.isLocked)
    throw new AppError(403, current.availability.reason, {
      unlocksAt: current.availability.unlocksAt,
    });
  return { ...lesson, module: { ...lesson.module, lessons } };
}
