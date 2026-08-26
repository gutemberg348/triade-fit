import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";
import { validate } from "../src/middlewares/validate.js";
import { errorHandler } from "../src/middlewares/errorHandler.js";
import { studentCreateSchema } from "../src/validators/admin.validators.js";

test("API devolve mensagens claras e separadas por campo", async () => {
  const app = express();
  app.use(express.json());
  app.post("/students", validate(studentCreateSchema), (_req, res) =>
    res.status(201).json({ ok: true }),
  );
  app.use(errorHandler);

  const response = await request(app).post("/students").send({
    name: "",
    email: "invalido",
    password: "123",
    programIds: [],
  });

  assert.equal(response.status, 422);
  assert.match(response.body.error, /Não foi possível salvar/);
  assert.equal(
    response.body.details.fieldErrors.email[0],
    "Informe um e-mail válido.",
  );
  assert.equal(
    response.body.details.fieldErrors.password[0],
    "Informe pelo menos 8 caracteres.",
  );
  assert.doesNotMatch(JSON.stringify(response.body), /Invalid email|Too small/);
});
