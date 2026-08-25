import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { Router } from "express";
import multer from "multer";
import { authenticate, authorize } from "../middlewares/auth.js";
import { AppError } from "../utils/AppError.js";
import { env } from "../config/env.js";

const uploadPath = path.resolve("uploads");
fs.mkdirSync(uploadPath, { recursive: true });
const allowedImageTypes = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
]);
const allowedVideoTypes = new Map([
  ["video/mp4", ".mp4"],
  ["video/webm", ".webm"],
  ["video/quicktime", ".mov"],
]);
const allowedFileTypes = new Map([
  ["application/pdf", ".pdf"],
  ["text/plain", ".txt"],
  ["application/msword", ".doc"],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".docx"],
  ["application/vnd.ms-excel", ".xls"],
  ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".xlsx"],
  ["application/vnd.ms-powerpoint", ".ppt"],
  ["application/vnd.openxmlformats-officedocument.presentationml.presentation", ".pptx"],
  ["application/zip", ".zip"],
]);
const storage = multer.diskStorage({
  destination: uploadPath,
  filename: (_req, file, callback) =>
    callback(
      null,
      `${Date.now()}-${crypto.randomUUID()}${
        allowedImageTypes.get(file.mimetype) ||
        allowedVideoTypes.get(file.mimetype) ||
        allowedFileTypes.get(file.mimetype) ||
        ""
      }`,
    ),
});
const imageUpload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) =>
    allowedImageTypes.has(file.mimetype)
      ? callback(null, true)
      : callback(new AppError(422, "Envie uma imagem JPG, PNG ou WebP.")),
});
const videoUpload = multer({
  storage,
  limits: { fileSize: 150 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) =>
    allowedVideoTypes.has(file.mimetype)
      ? callback(null, true)
      : callback(new AppError(422, "Envie um vídeo MP4, WebM ou MOV.")),
});
const fileUpload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) =>
    allowedFileTypes.has(file.mimetype)
      ? callback(null, true)
      : callback(
          new AppError(
            422,
            "Envie PDF, TXT, Word, Excel, PowerPoint ou ZIP de até 25 MB.",
          ),
        ),
});

const router = Router();
const responseFor = (req, res, next, kind) => {
  if (!req.file) return next(new AppError(422, "Selecione uma imagem."));
  res
    .status(201)
    .json({
      url: `${env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`}/uploads/${req.file.filename}`,
      type: kind,
    });
};
router.post("/", authenticate, imageUpload.single("image"), (req, res, next) => {
  responseFor(req, res, next, "image");
});
router.post("/video", authenticate, videoUpload.single("video"), (req, res, next) => {
  if (!req.file) return next(new AppError(422, "Selecione um vídeo."));
  responseFor(req, res, next, "video");
});
router.post(
  "/file",
  authenticate,
  authorize("ADMIN"),
  fileUpload.single("file"),
  (req, res, next) => {
    if (!req.file) return next(new AppError(422, "Selecione um arquivo."));
    res.status(201).json({
      url: `${env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`}/uploads/${req.file.filename}`,
      type: "file",
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
    });
  },
);
export default router;
