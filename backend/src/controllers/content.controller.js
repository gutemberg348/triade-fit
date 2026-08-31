import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";
import {
  requireEnrolledLesson,
  withContentModulesAvailability,
  withProgramProgress,
} from "../services/progress.service.js";
import {
  contentAssets,
  requestBaseUrl,
  singleLessonAssets,
} from "../utils/publicUrl.js";

const programInclude = (studentId) => ({
  modules: {
    where: { status: "PUBLISHED" },
    orderBy: { sortOrder: "asc" },
    include: {
      lessons: {
        where: { status: "PUBLISHED" },
        orderBy: { sortOrder: "asc" },
        include: {
          progress: {
            where: { studentId },
            select: { completed: true, completedAt: true, lastViewedAt: true },
          },
        },
      },
    },
  },
});

const flattenProgramLessons = (program) => ({
  ...program,
  lessons: program.modules.flatMap((module) =>
    module.lessons.map((lesson) => ({
      ...lesson,
      moduleId: module.id,
      moduleTitle: module.title,
    })),
  ),
});

const contentModuleInclude = (studentId) => ({
  program: { select: { id: true, title: true, type: true } },
  lessons: {
    where: { status: "PUBLISHED" },
    orderBy: { sortOrder: "asc" },
    include: {
      progress: {
        where: { studentId },
        select: { completed: true, completedAt: true, lastViewedAt: true },
      },
    },
  },
});

export const listHomeContent = async (req, res) => {
  const modules = await prisma.module.findMany({
    where: {
      status: "PUBLISHED",
      program: {
        type: "CONTENT",
        status: "PUBLISHED",
        enrollments: {
          some: { studentId: req.user.studentId, status: "ACTIVE" },
        },
      },
    },
    orderBy: [{ program: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    include: contentModuleInclude(req.user.studentId),
  });
  const enriched = withContentModulesAvailability(modules);
  const allLessons = enriched.flatMap((module) =>
    module.availability.isLocked
      ? []
      : module.lessons.map((lesson) => ({
          ...lesson,
          moduleId: module.id,
          moduleTitle: module.title,
        })),
  );
  const selected = allLessons.filter((lesson) => lesson.isIntroductory);
  const introLessons = selected.length ? selected : allLessons.slice(0, 3);
  const baseUrl = requestBaseUrl(req);
  res.json({
    introLessons: introLessons.map((lesson) => singleLessonAssets(lesson, baseUrl)),
    modules: enriched.map((module) => contentAssets(module, baseUrl)),
  });
};

export const getContentModule = async (req, res) => {
  const modules = await prisma.module.findMany({
    where: {
      status: "PUBLISHED",
      program: {
        type: "CONTENT",
        status: "PUBLISHED",
        enrollments: {
          some: { studentId: req.user.studentId, status: "ACTIVE" },
        },
      },
    },
    orderBy: [{ program: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    include: contentModuleInclude(req.user.studentId),
  });
  const module = withContentModulesAvailability(modules).find(
    (item) => item.id === req.params.id,
  );
  if (!module) throw new AppError(404, "Módulo não encontrado.");
  if (module.availability.isLocked)
    throw new AppError(403, module.availability.reason, {
      unlocksAt: module.availability.unlocksAt,
    });
  res.json(contentAssets(module, requestBaseUrl(req)));
};

export const listTrainingPrograms = async (req, res) => {
  const programs = await prisma.program.findMany({
    where: {
      type: "TRAINING",
      status: "PUBLISHED",
      enrollments: {
        some: { studentId: req.user.studentId, status: "ACTIVE" },
      },
    },
    orderBy: { sortOrder: "asc" },
    include: programInclude(req.user.studentId),
  });
  const baseUrl = requestBaseUrl(req);
  res.json(
    programs
      .map(withProgramProgress)
      .map(flattenProgramLessons)
      .map((program) => contentAssets(program, baseUrl)),
  );
};

export const getTrainingProgram = async (req, res) => {
  const program = await prisma.program.findFirst({
    where: {
      id: req.params.id,
      type: "TRAINING",
      status: "PUBLISHED",
      enrollments: {
        some: { studentId: req.user.studentId, status: "ACTIVE" },
      },
    },
    include: programInclude(req.user.studentId),
  });
  if (!program) throw new AppError(404, "Programa de treino não encontrado.");
  res.json(
    contentAssets(
      flattenProgramLessons(withProgramProgress(program)),
      requestBaseUrl(req),
    ),
  );
};

export const listPrograms = async (req, res) => {
  const programs = await prisma.program.findMany({
    where: {
      type: "CONTENT",
      status: "PUBLISHED",
      enrollments: {
        some: { studentId: req.user.studentId, status: "ACTIVE" },
      },
    },
    orderBy: { sortOrder: "asc" },
    include: programInclude(req.user.studentId),
  });
  const baseUrl = requestBaseUrl(req);
  res.json(programs.map(withProgramProgress).map((item) => contentAssets(item, baseUrl)));
};

export const listMeditations = async (req, res) => {
  const lessons = await prisma.lesson.findMany({
    where: {
      kind: "MEDITATION",
      status: "PUBLISHED",
      module: {
        status: "PUBLISHED",
        program: {
          status: "PUBLISHED",
          enrollments: {
            some: { studentId: req.user.studentId, status: "ACTIVE" },
          },
        },
      },
    },
    orderBy: [{ module: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    include: {
      module: {
        select: { title: true, program: { select: { title: true } } },
      },
      progress: {
        where: { studentId: req.user.studentId },
        select: { completed: true, completedAt: true },
      },
    },
  });
  const baseUrl = requestBaseUrl(req);
  res.json(lessons.map((lesson) => singleLessonAssets(lesson, baseUrl)));
};

export const getProgram = async (req, res) => {
  const program = await prisma.program.findFirst({
    where: {
      id: req.params.id,
      type: "CONTENT",
      status: "PUBLISHED",
      enrollments: {
        some: { studentId: req.user.studentId, status: "ACTIVE" },
      },
    },
    include: programInclude(req.user.studentId),
  });
  if (!program) throw new AppError(404, "Programa não encontrado.");
  res.json(contentAssets(withProgramProgress(program), requestBaseUrl(req)));
};

export const getModule = async (req, res) => {
  const program = await prisma.program.findFirst({
    where: {
      status: "PUBLISHED",
      modules: { some: { id: req.params.id, status: "PUBLISHED" } },
      enrollments: {
        some: { studentId: req.user.studentId, status: "ACTIVE" },
      },
    },
    include: programInclude(req.user.studentId),
  });
  if (!program) throw new AppError(404, "Módulo não encontrado.");
  const enriched = withProgramProgress(program);
  const module = enriched.modules.find((item) => item.id === req.params.id);
  res.json(contentAssets({
    ...module,
    program: { id: enriched.id, title: enriched.title },
  }, requestBaseUrl(req)));
};

export const getLesson = async (req, res) => {
  const lesson = await requireEnrolledLesson(req.user.studentId, req.params.id);
  await prisma.lessonProgress.upsert({
    where: {
      studentId_lessonId: {
        studentId: req.user.studentId,
        lessonId: lesson.id,
      },
    },
    update: { lastViewedAt: new Date() },
    create: { studentId: req.user.studentId, lessonId: lesson.id },
  });
  const index = lesson.module.lessons.findIndex(
    (item) => item.id === lesson.id,
  );
  res.json(singleLessonAssets({
    ...lesson,
    previousLesson: lesson.module.lessons[index - 1] || null,
    nextLesson: lesson.module.lessons[index + 1] || null,
  }, requestBaseUrl(req)));
};

export const completeLesson = async (req, res) => {
  const lesson = await requireEnrolledLesson(req.user.studentId, req.params.id);
  const completed = req.body.completed ?? true;
  const previousProgress = lesson.progress?.[0];
  const completedAt = completed
    ? previousProgress?.completedAt || new Date()
    : null;
  const progress = await prisma.lessonProgress.upsert({
    where: {
      studentId_lessonId: {
        studentId: req.user.studentId,
        lessonId: lesson.id,
      },
    },
    update: {
      completed,
      completedAt,
      lastViewedAt: new Date(),
    },
    create: {
      studentId: req.user.studentId,
      lessonId: lesson.id,
      completed,
      completedAt,
    },
  });
  res.json(progress);
};
