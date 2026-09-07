import {
  getTrainingAiConfig,
  updateTrainingAiConfig,
} from "../services/training-ai-config.service.js";

export const getConfig = async (_req, res) => {
  res.json(await getTrainingAiConfig());
};

export const updateConfig = async (req, res) => {
  res.json(await updateTrainingAiConfig(req.body));
};
