import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";
import {
  requireEnrolledLesson,
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

export const listPrograms = async (req, res) => {
  const programs = await prisma.program.findMany({
    where: {
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
  res.json({
    ...progress,
    caloriesAdded:
      completed && !previousProgress?.completed && lesson.kind === "WORKOUT"
        ? lesson.calories || 0
        : 0,
  });
};
