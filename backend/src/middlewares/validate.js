import { AppError } from "../utils/AppError.js";

const defaultZodMessage = /^(Invalid|Too |Expected|Unrecognized)/i;

const validationMessage = (issue) => {
  if (issue.message && !defaultZodMessage.test(issue.message))
    return issue.message;

  if (issue.code === "invalid_type")
    return issue.input === undefined || issue.input === null
      ? "Este campo é obrigatório."
      : "Informe um valor no formato correto.";
  if (issue.code === "too_small") {
    if (issue.origin === "string")
      return issue.minimum <= 1
        ? "Este campo é obrigatório."
        : `Informe pelo menos ${issue.minimum} caracteres.`;
    if (issue.origin === "array")
      return `Escolha pelo menos ${issue.minimum} item(ns).`;
    return `Informe um valor maior ou igual a ${issue.minimum}.`;
  }
  if (issue.code === "too_big") {
    if (issue.origin === "string")
      return `Use no máximo ${issue.maximum} caracteres.`;
    if (issue.origin === "array")
      return `Escolha no máximo ${issue.maximum} item(ns).`;
    return `Informe um valor menor ou igual a ${issue.maximum}.`;
  }
  if (issue.code === "invalid_format") {
    if (issue.format === "email") return "Informe um e-mail válido.";
    if (issue.format === "url") return "Informe uma URL completa e válida.";
    if (issue.format === "uuid") return "Escolha um registro válido.";
    if (issue.format === "date") return "Informe uma data válida.";
    if (String(issue.pattern).includes("A-Za-z"))
      return "Inclua pelo menos uma letra.";
    if (String(issue.pattern).includes("0-9"))
      return "Inclua pelo menos um número.";
    return "Informe este campo no formato esperado.";
  }
  if (issue.code === "invalid_value") return "Escolha uma opção válida.";
  return "Revise o valor informado.";
};

const validationDetails = (error) => {
  const fieldErrors = {};
  const formErrors = [];
  for (const issue of error.issues) {
    const message = validationMessage(issue);
    const field = issue.path?.[0];
    if (!field) formErrors.push(message);
    else (fieldErrors[field] ||= []).push(message);
  }
  return { fieldErrors, formErrors };
};

export const validate =
  (schema, source = "body") =>
  (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = validationDetails(result.error);
      const firstMessage =
        Object.values(details.fieldErrors)[0]?.[0] ||
        details.formErrors[0] ||
        "Revise os dados informados.";
      return next(
        new AppError(
          422,
          `Não foi possível salvar: ${firstMessage}`,
          details,
        ),
      );
    }
    // No Express 5, req.query é uma propriedade somente de leitura.
    // Guardamos a versão validada separadamente para não tentar sobrescrevê-la.
    if (source === "query") req.validatedQuery = result.data;
    else req[source] = result.data;
    next();
  };
