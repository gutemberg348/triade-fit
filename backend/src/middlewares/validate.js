import { AppError } from "../utils/AppError.js";

export const validate =
  (schema, source = "body") =>
  (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return next(
        new AppError(
          422,
          "Confira os campos destacados.",
          result.error.flatten(),
        ),
      );
    }
    // No Express 5, req.query é uma propriedade somente de leitura.
    // Guardamos a versão validada separadamente para não tentar sobrescrevê-la.
    if (source === "query") req.validatedQuery = result.data;
    else req[source] = result.data;
    next();
  };
