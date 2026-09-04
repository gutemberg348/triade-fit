import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";
import { validate } from "../src/middlewares/validate.js";
import { errorHandler } from "../src/middlewares/errorHandler.js";
import { studentCreateSchema } from "../src/validators/admin.validators.js";
import {
  measurementSchema,
  photoSchema,
} from "../src/validators/measurement.validators.js";

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

test("avaliação corporal exige pelo menos uma medida real", () => {
  const empty = measurementSchema.safeParse({ measuredAt: "2026-08-28" });
  assert.equal(empty.success, false);
  assert.match(empty.error.issues[0].message, /pelo menos uma medida/);

  const valid = measurementSchema.safeParse({
    measuredAt: "2026-08-28",
    waistCm: "82.5",
  });
  assert.equal(valid.success, true);
  assert.equal(valid.data.waistCm, 82.5);
});

test("foto de evolução aceita somente um módulo UUID válido", () => {
  const base = {
    photoUrl: "https://triade-fit.com/uploads/evolucao.jpg",
    pose: "FRONT",
    takenAt: "2026-09-03",
  };
  assert.equal(photoSchema.safeParse(base).success, true);
  assert.equal(photoSchema.safeParse({
    ...base,
    moduleId: "98c0606c-9cc8-4f76-ab33-fd97c3c94428",
  }).success, true);
  assert.equal(photoSchema.safeParse({ ...base, moduleId: "modulo-1" }).success, false);
});
