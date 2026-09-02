import { prisma } from "../config/prisma.js";
import { analyzeFoodImage, createTrainingAdvice, uploadedImageHash } from "../services/ai.service.js";
import { AppError } from "../utils/AppError.js";
import { absolutePublicUrl, relativePublicUrl, requestBaseUrl } from "../utils/publicUrl.js";

const numberOrZero = (value) => value == null ? 0 : Number(value);
const serializeEntry = ({ imageHash: _imageHash, ...entry }, baseUrl) => ({
  ...entry,
  photoUrl: absolutePublicUrl(entry.photoUrl, baseUrl),
  proteinGrams: numberOrZero(entry.proteinGrams),
  carbohydrateGrams: numberOrZero(entry.carbohydrateGrams),
  fatGrams: numberOrZero(entry.fatGrams),
});

const dayRange = (dateValue, offsetValue) => {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(dateValue || "")
    ? dateValue
    : new Date().toISOString().slice(0, 10);
  const offset = Math.max(-840, Math.min(840, Number(offsetValue) || 0));
  const [year, month, day] = date.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, day) + offset * 60000);
  return { date, start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
};

export const todayNutrition = async (req, res) => {
  const { date, start, end } = dayRange(req.query.date, req.query.timezoneOffset);
  const entries = await prisma.calorieEntry.findMany({
    where: { studentId: req.user.studentId, consumedAt: { gte: start, lt: end } },
    orderBy: { consumedAt: "desc" },
  });
  const serialized = entries.map((entry) => serializeEntry(entry, requestBaseUrl(req)));
  res.json({
    date,
    totalCalories: serialized.reduce((total, entry) => total + entry.calories, 0),
    totalProteinGrams: Math.round(serialized.reduce((total, entry) => total + entry.proteinGrams, 0) * 10) / 10,
    totalCarbohydrateGrams: Math.round(serialized.reduce((total, entry) => total + entry.carbohydrateGrams, 0) * 10) / 10,
    totalFatGrams: Math.round(serialized.reduce((total, entry) => total + entry.fatGrams, 0) * 10) / 10,
    entries: serialized,
  });
};

export const analyzeNutrition = async (req, res) => {
  const baseUrl = requestBaseUrl(req);
  const consumedAt = req.body.consumedAt ? new Date(req.body.consumedAt) : new Date();
  const { start, end } = dayRange(req.body.date, req.body.timezoneOffset);
  const imageHash = await uploadedImageHash(req.body.imageUrl);
  const duplicate = await prisma.calorieEntry.findFirst({
    where: {
      studentId: req.user.studentId,
      imageHash,
      consumedAt: { gte: start, lt: end },
    },
    orderBy: { createdAt: "desc" },
  });
  if (duplicate) {
    return res.json({
      ...serializeEntry(duplicate, baseUrl),
      duplicate: true,
      message: "Essa mesma foto já foi adicionada hoje.",
    });
  }
  const analysis = await analyzeFoodImage({
    studentId: req.user.studentId,
    imageUrl: req.body.imageUrl,
    note: req.body.note,
  });
  const entry = await prisma.calorieEntry.create({
    data: {
      studentId: req.user.studentId,
      photoUrl: relativePublicUrl(req.body.imageUrl, baseUrl),
      imageHash,
      foodName: analysis.foodName,
      portionDescription: analysis.portionDescription,
      calories: analysis.calories,
      proteinGrams: analysis.proteinGrams,
      carbohydrateGrams: analysis.carbohydrateGrams,
      fatGrams: analysis.fatGrams,
      confidence: analysis.confidence,
      analysis: analysis.analysis,
      consumedAt,
    },
  });
  res.status(201).json(serializeEntry(entry, baseUrl));
};

export const deleteNutritionEntry = async (req, res) => {
  const entry = await prisma.calorieEntry.findFirst({ where: { id: req.params.id, studentId: req.user.studentId } });
  if (!entry) throw new AppError(404, "Registro de alimento não encontrado.");
  await prisma.calorieEntry.delete({ where: { id: entry.id } });
  res.status(204).send();
};

export const trainingHistory = async (req, res) => {
  const messages = await prisma.trainingAiMessage.findMany({
    where: { studentId: req.user.studentId },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  res.json(messages.reverse());
};

export const trainingAdvice = async (req, res) => {
  const history = await prisma.trainingAiMessage.findMany({
    where: { studentId: req.user.studentId },
    orderBy: { createdAt: "desc" },
    take: 8,
  });
  const answer = await createTrainingAdvice({
    studentId: req.user.studentId,
    message: req.body.message,
    imageUrl: req.body.imageUrl,
    videoUrl: req.body.videoUrl,
    history: history.reverse(),
  });
  const [userMessage, assistantMessage] = await prisma.$transaction([
    prisma.trainingAiMessage.create({
      data: {
        studentId: req.user.studentId,
        role: "USER",
        message: req.body.message || (req.body.videoUrl ? "Vídeo enviado para análise." : "Foto enviada para análise."),
        imageUrl: req.body.imageUrl,
        videoUrl: req.body.videoUrl,
      },
    }),
    prisma.trainingAiMessage.create({
      data: { studentId: req.user.studentId, role: "ASSISTANT", message: answer },
    }),
  ]);
  res.status(201).json({ userMessage, assistantMessage });
};
