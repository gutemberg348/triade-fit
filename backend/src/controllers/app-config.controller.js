import { prisma } from "../config/prisma.js";
import {
  APP_CONFIG_ID,
  getAppConfig,
  serializeAppConfig,
} from "../services/app-config.service.js";
import { relativePublicUrl, requestBaseUrl } from "../utils/publicUrl.js";

export const publicConfig = async (req, res) => {
  const config = serializeAppConfig(await getAppConfig(), requestBaseUrl(req));
  res.json(config);
};

export const adminConfig = async (req, res) => {
  res.json(serializeAppConfig(await getAppConfig(), requestBaseUrl(req)));
};

export const updateConfig = async (req, res) => {
  const baseUrl = requestBaseUrl(req);
  const data = {
    ...req.body,
    loginImageUrl: relativePublicUrl(req.body.loginImageUrl, baseUrl),
    homeBannerUrl: relativePublicUrl(req.body.homeBannerUrl, baseUrl),
    paymentBannerUrl: relativePublicUrl(req.body.paymentBannerUrl, baseUrl),
  };
  const config = await prisma.appConfig.upsert({
    where: { id: APP_CONFIG_ID },
    update: data,
    create: { id: APP_CONFIG_ID, ...data },
  });
  res.json(serializeAppConfig(config, baseUrl));
};
