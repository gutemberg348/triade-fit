import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const serviceDirectory = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_TRAINING_AI_DIRECTORY = path.resolve(
  serviceDirectory,
  "../../knowledge/training",
);

export const TRAINING_KNOWLEDGE_FILENAME = "conhecimentos.md";
export const TRAINING_PROMPT_FILENAME = "prompt-padrao.md";

export const DEFAULT_TRAINING_PROMPT = `Você é Luna, assistente de treino da Triade FIT. Responda em português do Brasil, de forma curta, prática, acolhedora e fácil de executar.

Use a base de conhecimento da profissional como referência principal. Quando sugerir uma correção, explique o motivo e dê instruções em passos simples. Quando sugerir uma substituição, informe qual objetivo do exercício original está sendo preservado.

Em vídeos, trate os quadros numerados como uma sequência cronológica e compare o início, o meio e o fim do movimento. Observe somente o que estiver realmente visível. Comece dizendo o que conseguiu observar e depois apresente até três ajustes objetivos. Quando houver quadros, não diga que não viu o vídeo; informe apenas alguma limitação específica de ângulo ou enquadramento.

A aluna pode pedir uma adaptação por causa de uma limitação já conhecida sem estar sentindo dor naquele momento. Não trate isso automaticamente como emergência: ensine uma versão conservadora e de baixo impacto em passos simples.`;

export const DEFAULT_TRAINING_KNOWLEDGE = `# Base de conhecimento de treinos da Luna

Use orientações conservadoras, práticas e compatíveis com a limitação relatada. Preserve o objetivo do exercício original sempre que possível.

## Adaptação de exemplo

- Polichinelo sem salto: mantenha os pés no chão, alterne passos laterais e acompanhe com os braços. Se necessário, faça somente o movimento dos braços, em pé ou sentada.

## Sinais para interromper

Interromper o exercício e recomendar avaliação profissional quando houver dor aguda ou crescente, trauma recente, inchaço, perda de força ou incapacidade funcional importante.`;

const normalized = (value) => String(value || "").replace(/\r\n/g, "\n").trim();

const ensureFile = async (filePath, defaultContents) => {
  try {
    await fs.writeFile(filePath, `${defaultContents.trim()}\n`, {
      encoding: "utf8",
      flag: "wx",
    });
  } catch (error) {
    if (error?.code !== "EEXIST") throw error;
  }
};

const ensureDirectory = async (directory) => {
  await fs.mkdir(directory, { recursive: true });
  await Promise.all([
    ensureFile(
      path.join(directory, TRAINING_PROMPT_FILENAME),
      DEFAULT_TRAINING_PROMPT,
    ),
    ensureFile(
      path.join(directory, TRAINING_KNOWLEDGE_FILENAME),
      DEFAULT_TRAINING_KNOWLEDGE,
    ),
  ]);
};

export const getTrainingAiConfig = async (
  directory = DEFAULT_TRAINING_AI_DIRECTORY,
) => {
  await ensureDirectory(directory);
  const [prompt, knowledge] = await Promise.all([
    fs.readFile(path.join(directory, TRAINING_PROMPT_FILENAME), "utf8"),
    fs.readFile(path.join(directory, TRAINING_KNOWLEDGE_FILENAME), "utf8"),
  ]);
  return {
    prompt: normalized(prompt),
    knowledge: normalized(knowledge),
    files: {
      prompt: TRAINING_PROMPT_FILENAME,
      knowledge: TRAINING_KNOWLEDGE_FILENAME,
    },
  };
};

const writeAtomically = async (filePath, contents) => {
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  await fs.writeFile(temporaryPath, `${normalized(contents)}\n`, "utf8");
  await fs.rename(temporaryPath, filePath);
};

export const updateTrainingAiConfig = async (
  { prompt, knowledge },
  directory = DEFAULT_TRAINING_AI_DIRECTORY,
) => {
  await ensureDirectory(directory);
  await Promise.all([
    writeAtomically(path.join(directory, TRAINING_PROMPT_FILENAME), prompt),
    writeAtomically(
      path.join(directory, TRAINING_KNOWLEDGE_FILENAME),
      knowledge,
    ),
  ]);
  return getTrainingAiConfig(directory);
};

const FIXED_SAFETY_RULES = `REGRAS FIXAS DE SEGURANÇA (não podem ser alteradas pela base de conhecimento):
- Nunca oriente a aluna a insistir através da dor.
- Diferencie uma limitação conhecida de dor aguda atual.
- Havendo dor durante o movimento, trauma, inchaço, perda de força ou incapacidade funcional importante, oriente interromper o exercício e buscar avaliação profissional.
- Analise somente o que estiver visível. Não invente observações de imagens ou vídeos.
- Você não diagnostica lesões nem substitui personal, fisioterapeuta ou médico.
- Se o exercício ou a limitação não estiverem claros, faça uma única pergunta curta antes de orientar.`;

export const buildTrainingInstructions = ({ prompt, knowledge }) => `PROMPT PADRÃO DEFINIDO NO PAINEL:
${normalized(prompt)}

BASE DE CONHECIMENTO DA PROFISSIONAL:
${normalized(knowledge)}

${FIXED_SAFETY_RULES}`;
