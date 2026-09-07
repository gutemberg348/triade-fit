import assert from "node:assert/strict";
import test from "node:test";
import {
  APP_THEME_PRESETS,
  calculatePlan,
} from "../src/services/app-config.service.js";
import { appConfigSchema } from "../src/validators/admin.validators.js";

test("mantém Champagne Nude e o tema escuro original como presets", () => {
  assert.equal(APP_THEME_PRESETS.CHAMPAGNE_NUDE.background, "#F1E3D6");
  assert.equal(APP_THEME_PRESETS.CHAMPAGNE_NUDE.button, "#C97D74");
  assert.equal(APP_THEME_PRESETS.TRIADE_DARK.background, "#100B0A");
  assert.equal(APP_THEME_PRESETS.TRIADE_DARK.button, "#E8885B");
});

test("aceita somente as onze cores completas em hexadecimal", () => {
  const schema = appConfigSchema.pick({ themePreset: true, themeColors: true });
  const valid = schema.safeParse({
    themePreset: "CHAMPAGNE_NUDE",
    themeColors: APP_THEME_PRESETS.CHAMPAGNE_NUDE,
  });
  const invalid = schema.safeParse({
    themePreset: "CHAMPAGNE_NUDE",
    themeColors: {
      ...APP_THEME_PRESETS.CHAMPAGNE_NUDE,
      button: "rosa",
    },
  });
  assert.equal(valid.success, true);
  assert.equal(invalid.success, false);
});

test("calcula total, juros e parcela do cartão em centavos", () => {
  const plan = calculatePlan({
    planTitle: "Plano anual",
    planDescription: "Acesso completo",
    planDurationMonths: 12,
    pixPriceCents: 10000,
    cardBasePriceCents: 12000,
    cardInstallments: 12,
    cardInterestPercent: 10,
  });

  assert.deepEqual(plan.pix, { totalCents: 10000 });
  assert.equal(plan.card.interestCents, 1200);
  assert.equal(plan.card.totalCents, 13200);
  assert.equal(plan.card.installmentCents, 1100);
});

test("limita parcelas do cartão ao mínimo de cinco reais exigido pelo Asaas", () => {
  const plan = calculatePlan({
    planTitle: "Plano anual",
    planDescription: "Acesso completo",
    planDurationMonths: 12,
    pixPriceCents: 1200,
    cardBasePriceCents: 1200,
    cardInstallments: 12,
    cardInterestPercent: 0,
  });

  assert.equal(plan.card.configuredInstallments, 12);
  assert.equal(plan.card.installments, 2);
  assert.equal(plan.card.installmentCents, 600);
});
