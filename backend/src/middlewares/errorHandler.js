import { Prisma } from "@prisma/client";
import { AppError } from "../utils/AppError.js";

export const notFound = (req, _res, next) =>
  next(
    new AppError(404, `Rota não encontrada: ${req.method} ${req.originalUrl}`),
  );

export const errorHandler = (error, _req, res, _next) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const fields = Array.isArray(error.meta?.target)
        ? error.meta.target
        : error.meta?.target
          ? [error.meta.target]
          : [];
      return res
        .status(409)
        .json({
          error: fields.includes("email")
            ? "Este e-mail já possui uma conta."
            : "Já existe um registro com esses dados.",
          fields,
          details: {
            fieldErrors: Object.fromEntries(
              fields.map((field) => [
                field,
                [
                  field === "email"
                    ? "Este e-mail já possui uma conta."
                    : "Este dado já está cadastrado.",
                ],
              ]),
            ),
            formErrors: [],
          },
        });
    }
    if (error.code === "P2025")
      return res.status(404).json({ error: "Registro não encontrado." });
  }
  const status = error.statusCode || 500;
  const isOperational = error instanceof AppError;
  if (status >= 500) console.error(error);
  return res
    .status(status)
    .json({
      error: isOperational ? error.message : "Erro interno do servidor.",
      ...(isOperational && error.details ? { details: error.details } : {}),
    });
};
