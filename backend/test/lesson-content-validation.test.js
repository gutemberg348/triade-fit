import assert from "node:assert/strict";
import test from "node:test";
import { lessonSchema } from "../src/validators/admin.validators.js";

const baseLesson = {
  moduleId: "9cefc6c1-6f70-4db0-9647-bda8d67b9e80",
  title: "Capítulo com material",
  status: "PUBLISHED",
  kind: "WORKOUT",
  showMeditationButton: false,
  unlockDelayHours: 48,
};

test("aceita arquivo ou link HTTP e atraso de liberação", () => {
  const result = lessonSchema.safeParse({
    ...baseLesson,
    materials: [
      { title: "Guia em PDF", url: "https://api.exemplo.com/uploads/guia.pdf", type: "FILE" },
      { title: "Leitura complementar", url: "https://exemplo.com/artigo", type: "LINK" },
    ],
  });
  assert.equal(result.success, true);
  assert.equal(result.data.unlockDelayHours, 48);
});

test("recusa protocolo inseguro em material externo", () => {
  const result = lessonSchema.safeParse({
    ...baseLesson,
    materials: [{ title: "Inválido", url: "javascript:alert(1)", type: "LINK" }],
  });
  assert.equal(result.success, false);
});
