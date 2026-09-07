import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  buildTrainingInstructions,
  getTrainingAiConfig,
  updateTrainingAiConfig,
} from "../src/services/training-ai-config.service.js";

test("salva prompt e conhecimento em arquivos Markdown", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "triade-training-ai-"));
  try {
    const prompt = "Responda como a Luna, com explicações objetivas e acolhedoras. ".repeat(2);
    const knowledge = "# Agachamento\n\nOriente apoio estável e amplitude confortável. ".repeat(2);
    await updateTrainingAiConfig({ prompt, knowledge }, directory);
    const saved = await getTrainingAiConfig(directory);

    assert.equal(saved.prompt, prompt.trim());
    assert.equal(saved.knowledge, knowledge.trim());
    assert.equal(saved.files.prompt, "prompt-padrao.md");
    assert.equal(saved.files.knowledge, "conhecimentos.md");
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("combina prompt e conhecimento sem remover as regras fixas de segurança", () => {
  const instructions = buildTrainingInstructions({
    prompt: "Seja objetiva.",
    knowledge: "Polichinelo adaptado deve ser realizado sem salto.",
  });

  assert.match(instructions, /Seja objetiva/);
  assert.match(instructions, /Polichinelo adaptado/);
  assert.match(instructions, /Nunca oriente a aluna a insistir através da dor/);
});
