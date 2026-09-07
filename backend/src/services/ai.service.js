import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import ffmpegStatic from "ffmpeg-static";
import OpenAI from "openai";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";
import {
  buildTrainingInstructions,
  getTrainingAiConfig,
} from "./training-ai-config.service.js";

const execFileAsync = promisify(execFile);
const ffmpegCommand = process.env.FFMPEG_PATH || (process.platform === "win32" ? ffmpegStatic : "ffmpeg");
const uploadRoot = path.resolve("uploads");
const imageMime = new Map([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"],
]);

const client = env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: env.OPENAI_API_KEY, timeout: 90000, maxRetries: 1 })
  : null;

const requireClient = () => {
  if (!client)
    throw new AppError(
      503,
      "A Luna ainda não foi configurada. Adicione OPENAI_API_KEY no backend.",
    );
  return client;
};

const localUploadPath = async (value, expected) => {
  let pathname;
  try {
    pathname = new URL(value, "http://triade.local").pathname;
  } catch {
    throw new AppError(422, "Envie primeiro o arquivo para a Triade FIT.");
  }
  if (!pathname.startsWith("/uploads/"))
    throw new AppError(422, "Use um arquivo enviado pela Triade FIT.");
  const filename = path.basename(decodeURIComponent(pathname));
  const resolved = path.resolve(uploadRoot, filename);
  if (path.dirname(resolved) !== uploadRoot)
    throw new AppError(422, "Arquivo inválido.");
  const extension = path.extname(resolved).toLowerCase();
  if (expected === "image" && !imageMime.has(extension))
    throw new AppError(422, "Envie uma imagem JPG, PNG ou WebP.");
  if (expected === "video" && ![".mp4", ".webm", ".mov"].includes(extension))
    throw new AppError(422, "Envie um vídeo MP4, WebM ou MOV.");
  try {
    await fs.access(resolved);
  } catch {
    throw new AppError(404, "O arquivo enviado não foi encontrado.");
  }
  return resolved;
};

const imageDataUrl = async (filePath) => {
  const mime = imageMime.get(path.extname(filePath).toLowerCase()) || "image/jpeg";
  return `data:${mime};base64,${await fs.readFile(filePath, "base64")}`;
};

export const uploadedImageHash = async (imageUrl) => {
  const filePath = await localUploadPath(imageUrl, "image");
  const contents = await fs.readFile(filePath);
  return crypto.createHash("sha256").update(contents).digest("hex");
};

const responseText = (response) => {
  const text = response.output_text?.trim();
  if (!text) throw new AppError(502, "A Luna não conseguiu concluir a análise.");
  return text;
};

const createResponse = async (payload) => {
  try {
    return await requireClient().responses.create(payload);
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error("Falha na OpenAI:", error?.status, error?.code, error?.message);
    if (error?.status === 401)
      throw new AppError(503, "A chave da Luna foi recusada. Confira OPENAI_API_KEY no servidor.");
    if (error?.status === 429)
      throw new AppError(503, "A Luna está temporariamente ocupada. Tente novamente em alguns minutos.");
    throw new AppError(502, "A Luna não conseguiu responder agora. Tente novamente.");
  }
};

const safetyIdentifier = (studentId) =>
  crypto.createHash("sha256").update(studentId).digest("hex").slice(0, 64);

export const analyzeFoodImage = async ({ studentId, imageUrl, note }) => {
  const imagePath = await localUploadPath(imageUrl, "image");
  const image = await imageDataUrl(imagePath);
  const response = await createResponse({
    model: env.OPENAI_MODEL,
    store: false,
    reasoning: { effort: "low" },
    max_output_tokens: 1400,
    safety_identifier: safetyIdentifier(studentId),
    instructions:
      "Você é Luna, assistente nutricional da Triade FIT. Analise somente o alimento visível e calcule calorias e macronutrientes para a quantidade que a aluna declarou ter consumido. Não presuma que uma embalagem, travessa, bolo ou pão inteiro visível foi totalmente consumido, a menos que a observação diga isso explicitamente. Quando houver peso em gramas, prefira composição média por 100 g e faça o cálculo proporcional. Quando houver unidades, fatias ou porções, use uma porção brasileira convencional e explique a base. Arredonde calorias para o múltiplo de 5 mais próximo e macronutrientes para uma casa decimal. Mantenha estimativas consistentes e prudentes. Nunca trate a estimativa visual como valor exato, diagnóstico ou prescrição. Responda em português do Brasil.",
    input: [{
      role: "user",
      content: [
        {
          type: "input_text",
          text: `Identifique a refeição e estime apenas a quantidade consumida. Quantidade/observação informada pela aluna: ${note || "não informada"}. Se a quantidade não estiver clara, estime uma porção convencional — nunca o item inteiro visível —, use confiança baixa e diga qual porção adotou.`,
        },
        { type: "input_image", image_url: image, detail: "high" },
      ],
    }],
    text: {
      format: {
        type: "json_schema",
        name: "nutrition_analysis",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["foodName", "portionDescription", "calories", "proteinGrams", "carbohydrateGrams", "fatGrams", "confidence", "analysis"],
          properties: {
            foodName: { type: "string" },
            portionDescription: { type: "string" },
            calories: { type: "integer", minimum: 0, maximum: 10000 },
            proteinGrams: { type: "number", minimum: 0, maximum: 1000 },
            carbohydrateGrams: { type: "number", minimum: 0, maximum: 1000 },
            fatGrams: { type: "number", minimum: 0, maximum: 1000 },
            confidence: { type: "string", enum: ["baixa", "média", "alta"] },
            analysis: { type: "string" },
          },
        },
      },
    },
  });
  try {
    return JSON.parse(responseText(response));
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(502, "A Luna devolveu uma análise nutricional incompleta.");
  }
};

const videoFrames = async (videoUrl) => {
  const input = await localUploadPath(videoUrl, "video");
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "triade-ai-"));
  const pattern = path.join(temporary, "frame-%02d.jpg");
  try {
    let metadata = "";
    try {
      await execFileAsync(ffmpegCommand, ["-hide_banner", "-i", input], {
        timeout: 15000,
        maxBuffer: 1024 * 1024,
      });
    } catch (error) {
      if (error?.code === "ENOENT") throw error;
      metadata = String(error?.stderr || "");
    }
    const durationMatch = metadata.match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
    const duration = durationMatch
      ? Number(durationMatch[1]) * 3600 + Number(durationMatch[2]) * 60 + Number(durationMatch[3])
      : Number.NaN;
    if (!Number.isFinite(duration) || duration <= 0)
      throw new AppError(422, "Não foi possível identificar a duração desse vídeo.");
    const frameTarget = 8;
    const framesPerSecond = Math.max(frameTarget / duration, 0.05);
    await execFileAsync(
      ffmpegCommand,
      ["-loglevel", "error", "-i", input, "-vf", `fps=${framesPerSecond},scale=960:-2`, "-frames:v", String(frameTarget), "-q:v", "3", pattern],
      { timeout: 90000, maxBuffer: 2 * 1024 * 1024 },
    );
    const frames = (await fs.readdir(temporary))
      .filter((file) => file.endsWith(".jpg"))
      .sort()
      .slice(0, frameTarget);
    if (frames.length < 2)
      throw new AppError(422, "O vídeo não mostrou movimento suficiente. Envie um vídeo um pouco mais longo e com o corpo visível.");
    const images = await Promise.all(frames.map((file) => imageDataUrl(path.join(temporary, file))));
    return { images, cleanup: () => fs.rm(temporary, { recursive: true, force: true }) };
  } catch (error) {
    await fs.rm(temporary, { recursive: true, force: true });
    if (error instanceof AppError) throw error;
    throw new AppError(503, "Não foi possível preparar o vídeo para a Luna. Tente enviar uma foto ou um vídeo menor.");
  }
};

export const createTrainingAdvice = async ({ studentId, message, imageUrl, videoUrl, history }) => {
  const trainingConfig = await getTrainingAiConfig();
  let images = [];
  let cleanup = async () => {};
  if (imageUrl) images = [await imageDataUrl(await localUploadPath(imageUrl, "image"))];
  if (videoUrl) ({ images, cleanup } = await videoFrames(videoUrl));
  const historyText = history.length
    ? history.map((item) => `${item.role === "ASSISTANT" ? "Luna" : "Aluna"}: ${item.message}`).join("\n")
    : "Sem conversa anterior.";
  const mediaContent = videoUrl
    ? images.flatMap((image, index) => [
        { type: "input_text", text: `Quadro ${index + 1} de ${images.length}, extraído em ordem cronológica do vídeo.` },
        { type: "input_image", image_url: image, detail: "high" },
      ])
    : images.map((image) => ({ type: "input_image", image_url: image, detail: "high" }));
  try {
    const response = await createResponse({
      model: env.OPENAI_MODEL,
      store: false,
      reasoning: { effort: "low" },
      max_output_tokens: 1800,
      safety_identifier: safetyIdentifier(studentId),
      instructions: buildTrainingInstructions(trainingConfig),
      input: [{
        role: "user",
        content: [
          { type: "input_text", text: `Histórico recente:\n${historyText}\n\nPedido atual: ${message || "Analise minha execução e dê orientações seguras."}` },
          ...mediaContent,
        ],
      }],
    });
    return { text: responseText(response), framesAnalyzed: videoUrl ? images.length : 0 };
  } finally {
    await cleanup();
  }
};
