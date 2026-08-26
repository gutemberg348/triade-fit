import test from "node:test";
import assert from "node:assert/strict";
import { studentPasswordSchema } from "../src/validators/admin.validators.js";

test("senha administrativa da aluna exige confirmação igual", () => {
  assert.equal(
    studentPasswordSchema.safeParse({
      password: "NovaSenha123",
      passwordConfirmation: "NovaSenha123",
    }).success,
    true,
  );
  assert.equal(
    studentPasswordSchema.safeParse({
      password: "NovaSenha123",
      passwordConfirmation: "OutraSenha123",
    }).success,
    false,
  );
});

test("senha administrativa mantém os requisitos mínimos", () => {
  assert.equal(
    studentPasswordSchema.safeParse({
      password: "somenteletras",
      passwordConfirmation: "somenteletras",
    }).success,
    false,
  );
});
