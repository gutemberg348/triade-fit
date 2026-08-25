import { prisma } from "../config/prisma.js";
import {
  createMeasurement,
  evolution,
  serializeMeasurement,
} from "../services/measurement.service.js";

export const list = async (req, res) => {
  const items = await prisma.bodyMeasurement.findMany({
    where: { studentId: req.user.studentId },
    orderBy: { measuredAt: "desc" },
    include: { recordedBy: { select: { id: true, name: true, role: true } } },
  });
  res.json(items.map(serializeMeasurement));
};
export const create = async (req, res) =>
  res
    .status(201)
    .json(await createMeasurement(req.user.studentId, req.user.id, req.body));
export const getEvolution = async (req, res) =>
  res.json(await evolution(req.user.studentId));
export const listPhotos = async (req, res) =>
  res.json(
    await prisma.progressPhoto.findMany({
      where: { studentId: req.user.studentId },
      orderBy: { takenAt: "desc" },
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
