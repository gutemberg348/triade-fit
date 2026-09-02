import { prisma } from "../config/prisma.js";
import {
  createMeasurement,
  evolution,
  serializeMeasurement,
} from "../services/measurement.service.js";
import { AppError } from "../utils/AppError.js";

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
    }),
  );
export const createPhoto = async (req, res) =>
  res
    .status(201)
    .json(
      await prisma.progressPhoto.create({
        data: {
          ...req.body,
          takenAt: new Date(req.body.takenAt),
          studentId: req.user.studentId,
        },
      }),
    );
