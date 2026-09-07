import { prisma } from "../config/prisma.js";
import { absolutePublicUrl } from "../utils/publicUrl.js";

export const APP_CONFIG_ID = "app";

export const APP_THEME_PRESETS = {
  CHAMPAGNE_NUDE: {
    background: "#F1E3D6",
    cardBackground: "#F8EFE7",
    secondaryBackground: "#E8D3C2",
    button: "#C97D74",
    buttonPressed: "#B96D65",
    title: "#301F19",
    text: "#60483D",
    secondaryText: "#8A6F62",
    border: "#D9C2B2",
    activeIcon: "#B96D65",
    inactiveIcon: "#8A6F62",
  },
  TRIADE_DARK: {
    background: "#100B0A",
    cardBackground: "#1C1311",
    secondaryBackground: "#241815",
    button: "#E8885B",
    buttonPressed: "#9E3F22",
    title: "#FFFFFF",
    text: "#E3D2C9",
    secondaryText: "#C9AEA1",
    border: "#4D352B",
    activeIcon: "#E8885B",
    inactiveIcon: "#C9AEA1",
  },
};

const normalizeTheme = (config) => {
  const presetName = Object.prototype.hasOwnProperty.call(
    APP_THEME_PRESETS,
    config.themePreset,
  )
    ? config.themePreset
    : "CHAMPAGNE_NUDE";
  const custom = config.themeColors;
  return {
    themePreset: presetName,
    themeColors: {
      ...APP_THEME_PRESETS[presetName],
      ...(custom && typeof custom === "object" && !Array.isArray(custom)
        ? custom
        : {}),
    },
  };
};

export const DEFAULT_APP_CONFIG = {
  id: APP_CONFIG_ID,
  appName: "Triade FIT",
  themePreset: "CHAMPAGNE_NUDE",
  themeColors: APP_THEME_PRESETS.CHAMPAGNE_NUDE,
  loginImageUrl: "/brand/triade-fit-login.png",
  loginEyebrow: "SUA JORNADA COMEÇA AQUI",
  loginHeadline: "Seu corpo pede equilíbrio.",
  loginSubtitle: "Treinos, cuidado e evolução lado a lado, no seu ritmo.",
  homeBannerUrl: "/brand/triade-fit-home.png",
  homeBannerLabel: "CONTINUE SUA JORNADA",
  paymentBannerUrl: "/brand/triade-fit-balance.png",
  planTitle: "Plano Triade FIT — 12 meses",
  planDescription: "Acesso completo por 12 meses",
  planDurationMonths: 12,
  pixPriceCents: 1200,
  cardBasePriceCents: 1200,
  cardInstallments: 12,
  cardInterestPercent: 0,
};

export const getAppConfig = () =>
  prisma.appConfig.upsert({
    where: { id: APP_CONFIG_ID },
    update: {},
    create: DEFAULT_APP_CONFIG,
  });

export const calculatePlan = (config) => {
  const interestPercent = Number(config.cardInterestPercent);
  const cardInterestCents = Math.round(
    config.cardBasePriceCents * (interestPercent / 100),
  );
  const cardTotalCents = config.cardBasePriceCents + cardInterestCents;
  // O Asaas exige parcela mínima de R$ 5,00 no cartão. A duração do acesso
  // continua independente da quantidade efetiva de parcelas do pagamento.
  const cardInstallments = Math.min(
    config.cardInstallments,
    Math.max(1, Math.floor(cardTotalCents / 500)),
  );
  return {
    code: "INITIAL_12_MONTHS",
    title: config.planTitle,
    description: config.planDescription,
    durationMonths: config.planDurationMonths,
    pix: { totalCents: config.pixPriceCents },
    card: {
      basePriceCents: config.cardBasePriceCents,
      interestPercent,
      interestCents: cardInterestCents,
      totalCents: cardTotalCents,
      installments: cardInstallments,
      configuredInstallments: config.cardInstallments,
      installmentCents: Math.round(cardTotalCents / cardInstallments),
    },
  };
};

export const serializeAppConfig = (config, baseUrl) => {
  const theme = normalizeTheme(config);
  return {
    ...config,
    ...theme,
    loginImageUrl: absolutePublicUrl(config.loginImageUrl, baseUrl),
    homeBannerUrl: absolutePublicUrl(config.homeBannerUrl, baseUrl),
    paymentBannerUrl: absolutePublicUrl(config.paymentBannerUrl, baseUrl),
    cardInterestPercent: Number(config.cardInterestPercent),
    plan: calculatePlan(config),
  };
};
