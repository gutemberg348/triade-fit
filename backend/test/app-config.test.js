import assert from "node:assert/strict";
import test from "node:test";
import { calculatePlan } from "../src/services/app-config.service.js";

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
