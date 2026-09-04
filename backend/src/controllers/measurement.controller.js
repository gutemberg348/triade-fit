import { prisma } from "../config/prisma.js";
import {
  createMeasurement,
  evolution,
  serializeMeasurement,
} from "../services/measurement.service.js";
import { AppError } from "../utils/AppError.js";
import { withContentModulesAvailability } from "../services/progress.service.js";

const availablePhotoModules = async (studentId) => {
  const modules = await prisma.module.findMany({
    where: {
      status: "PUBLISHED",
      program: {
        type: "CONTENT",
        status: "PUBLISHED",
        enrollments: { some: { studentId, status: "ACTIVE" } },
      },
    },
    orderBy: [{ program: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    include: {
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
  return withContentModulesAvailability(modules);
};

const resolvePhotoModule = async (studentId, requestedModuleId) => {
  const modules = await availablePhotoModules(studentId);
  const module = requestedModuleId
    ? modules.find((item) => item.id === requestedModuleId)
    : modules.filter((item) => !item.availability.isLocked).at(-1);
  if (!module) throw new AppError(422, "Nenhum módulo da sua jornada está disponível para este registro.");
  if (module.availability.isLocked)
    throw new AppError(403, module.availability.reason || "Este módulo ainda não foi liberado.");
  return module;
};

export const list = async (req, res) => {
  const items = await prisma.bodyMeasurement.findMany({
    where: { studentId: req.user.studentId },
    orderBy: { measuredAt: "desc" },
    include: { recordedBy: { select: { id: true, name: true, role: true } } },
  });
  res.json(items.map(serializeMeasurement));
};
export const create = async (req, res) => {
  const previous = await prisma.bodyMeasurement.findFirst({
    where: { studentId: req.user.studentId },
    select: { id: true },
  });
  if (!previous && (req.body.weightKg == null || req.body.heightCm == null)) {
    const fieldErrors = {};
    if (req.body.weightKg == null) fieldErrors.weightKg = ["Informe seu peso inicial."];
    if (req.body.heightCm == null) fieldErrors.heightCm = ["Informe sua altura inicial."];
    throw new AppError(
      422,
      "Para criar seu ponto de partida, informe peso e altura. A gordura corporal é opcional.",
      { fieldErrors, formErrors: [] },
    );
  }
  res
    .status(201)
    .json(await createMeasurement(req.user.studentId, req.user.id, req.body));
};
export const getEvolution = async (req, res) =>
  res.json(await evolution(req.user.studentId));
export const listPhotos = async (req, res) =>
  res.json(
    await prisma.progressPhoto.findMany({
      where: { studentId: req.user.studentId },
      orderBy: [{ takenAt: "desc" }, { createdAt: "desc" }],
      include: {
        module: { select: { id: true, title: true, sortOrder: true, coverUrl: true } },
      },
    }),
  );
export const createPhoto = async (req, res) => {
  const module = await resolvePhotoModule(req.user.studentId, req.body.moduleId);
  const { moduleId: _requestedModuleId, ...data } = req.body;
  res.status(201).json(
    await prisma.progressPhoto.create({
      data: {
        ...data,
        moduleId: module.id,
        takenAt: new Date(req.body.takenAt),
        studentId: req.user.studentId,
      },
      include: {
        module: { select: { id: true, title: true, sortOrder: true, coverUrl: true } },
      },
    }),
  );
};
