import test from "node:test";
import assert from "node:assert/strict";
import { nutritionAnalysisSchema, trainingAdviceSchema } from "../src/validators/ai.validators.js";

test("análise nutricional aceita foto enviada e observação opcional", () => {
  const result = nutritionAnalysisSchema.safeParse({
    imageUrl: "https://api.triade-fit.com/uploads/refeicao.jpg",
    note: "Prato com cerca de 300 gramas",
    consumedAt: new Date().toISOString(),
  });
  assert.equal(result.success, true);
});

test("ajuda com treino exige texto ou mídia", () => {
  const empty = trainingAdviceSchema.safeParse({ message: "" });
  assert.equal(empty.success, false);
  assert.equal(empty.error.issues[0].path[0], "message");
});

test("ajuda com treino aceita um vídeo, mas não foto e vídeo juntos", () => {
  const video = trainingAdviceSchema.safeParse({
    videoUrl: "https://api.triade-fit.com/uploads/agachamento.mp4",
  });
  assert.equal(video.success, true);

  const both = trainingAdviceSchema.safeParse({
    imageUrl: "https://api.triade-fit.com/uploads/agachamento.jpg",
    videoUrl: "https://api.triade-fit.com/uploads/agachamento.mp4",
  });
  assert.equal(both.success, false);
  assert.equal(both.error.issues[0].path[0], "videoUrl");
});
