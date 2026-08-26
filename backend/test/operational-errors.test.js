import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";
import { errorHandler } from "../src/middlewares/errorHandler.js";
import { AppError } from "../src/utils/AppError.js";

const appFor = (error) => {
  const app = express();
  app.get("/test", (_req, _res, next) => next(error));
  app.use(errorHandler);
  return app;
};

test("API mostra erro operacional seguro do gateway", async () => {
  const response = await request(
    appFor(
      new AppError(503, "A chave do Asaas não corresponde ao ambiente sandbox.", {
        gateway: { provider: "asaas", codes: ["invalid_environment"] },
      }),
    ),
  ).get("/test");

  assert.equal(response.status, 503);
  assert.equal(
    response.body.error,
    "A chave do Asaas não corresponde ao ambiente sandbox.",
  );
  assert.deepEqual(response.body.details.gateway.codes, ["invalid_environment"]);
});

test("API não vaza a mensagem de um erro inesperado", async () => {
  const response = await request(
    appFor(new Error("detalhe interno que não pode sair")),
  ).get("/test");

  assert.equal(response.status, 500);
  assert.equal(response.body.error, "Erro interno do servidor.");
  assert.doesNotMatch(JSON.stringify(response.body), /detalhe interno/);
});
