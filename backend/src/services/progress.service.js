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
      reason: "Conclua a aula anterior para liberar este conteúdo.",
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
    reason: "Esta aula será liberada após o intervalo definido pela Personal.",
  };
};

export function withModuleProgress(module, now = new Date()) {
  const lessons = module.lessons || [];
  const enrichedLessons = lessons.map((lesson, index) => ({
    ...lesson,
    availability: availabilityFor(lessons, index, now),
  }));
  const completedLessons = enrichedLessons.filter(
    (lesson) => lesson.progress?.[0]?.completed,
  ).length;
  return {
    ...module,
    lessons: enrichedLessons,
    completedLessons,
    totalLessons: enrichedLessons.length,
    progressPercent: enrichedLessons.length
      ? Math.round((completedLessons / enrichedLessons.length) * 100)
      : 0,
  };
}

const moduleCompletionAt = (module) => {
  if (!module.lessons?.length) return null;
  const completionDates = module.lessons.map((lesson) => {
    const progress = lesson.progress?.[0];
    return progress?.completed ? progress.completedAt : null;
  });
  if (completionDates.some((completedAt) => !completedAt)) return null;
  return new Date(Math.max(...completionDates.map((date) => new Date(date).getTime())));
};

export function withContentModulesAvailability(modules, now = new Date()) {
  const enriched = modules.map((module) => withModuleProgress(module, now));
  return enriched.map((module, index) => {
    const previous = index > 0 ? enriched[index - 1] : null;
    const previousCompletedAt = previous ? moduleCompletionAt(previous) : null;
    const photoAvailability = index === 0 || previousCompletedAt
      ? { isLocked: false, unlocksAt: null, reason: null }
      : {
          isLocked: true,
          unlocksAt: null,
          reason: `Conclua o módulo “${previous.title}” para liberar o próximo registro visual.`,
        };

    let availability;
    if (module.progressPercent === 100 || index === 0) {
      availability = { isLocked: false, unlocksAt: null, reason: null };
    } else if (!previousCompletedAt) {
      availability = {
        isLocked: true,
        unlocksAt: null,
        reason: `Conclua o módulo “${previous.title}” para liberar este conteúdo.`,
      };
    } else {
      const delayDays = module.unlockDelayDays || 0;
      if (!delayDays) {
        availability = { isLocked: false, unlocksAt: null, reason: null };
      } else {
        const unlocksAt = new Date(
          previousCompletedAt.getTime() + delayDays * 24 * 60 * 60 * 1000,
        );
        availability = unlocksAt <= now
          ? { isLocked: false, unlocksAt: unlocksAt.toISOString(), reason: null }
          : {
              isLocked: true,
              unlocksAt: unlocksAt.toISOString(),
              reason: `Este módulo abre ${delayDays} dia${delayDays === 1 ? "" : "s"} após concluir o anterior.`,
            };
      }
    }
    return { ...module, availability, photoAvailability };
  });
}

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
          program: { select: { id: true, title: true, type: true } },
        },
      },
      progress: {
        where: { studentId },
        select: { completed: true, completedAt: true, lastViewedAt: true },
      },
    },
  });
  if (!lesson) throw new AppError(404, "Aula não encontrada ou indisponível.");
  if (lesson.module.program.type === "CONTENT") {
    const contentModules = await prisma.module.findMany({
      where: {
        status: "PUBLISHED",
        program: {
          type: "CONTENT",
          status: "PUBLISHED",
          enrollments: { some: { studentId, status: "ACTIVE" } },
        },
      },
      orderBy: [{ program: { sortOrder: "asc" } }, { sortOrder: "asc" }],
      select: {
        id: true,
        title: true,
        unlockDelayDays: true,
        lessons: {
          where: { status: "PUBLISHED" },
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            unlockDelayHours: true,
            progress: {
              where: { studentId },
              select: { completed: true, completedAt: true },
            },
          },
        },
      },
    });
    const currentModule = withContentModulesAvailability(contentModules).find(
      (module) => module.id === lesson.module.id,
    );
    if (currentModule?.availability.isLocked)
      throw new AppError(403, currentModule.availability.reason, {
        unlocksAt: currentModule.availability.unlocksAt,
      });
  }
  const modules = await prisma.module.findMany({
    where: {
      programId: lesson.module.program.id,
      ...(lesson.module.program.type === "CONTENT"
        ? { id: lesson.module.id }
        : {}),
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
