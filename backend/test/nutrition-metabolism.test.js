import test from "node:test";
import assert from "node:assert/strict";
import { calculateMetabolism } from "../src/services/nutrition.service.js";
import { nutritionProfileSchema } from "../src/validators/ai.validators.js";

test("calcula TMB e referência diária pela equação de Mifflin-St Jeor", () => {
  const result = calculateMetabolism({
    biologicalSex: "FEMALE",
    ageYears: 30,
    weightKg: 70,
    heightCm: 165,
    activityLevel: "LIGHT",
  });
  assert.deepEqual(result, { basalCalories: 1420, dailyCalorieTarget: 1953 });
});

test("perfil metabólico valida idade, medidas e atividade", () => {
  const valid = nutritionProfileSchema.safeParse({
    biologicalSex: "MALE",
    ageYears: 35,
    weightKg: 82,
    heightCm: 178,
    activityLevel: "MODERATE",
  });
  assert.equal(valid.success, true);
  assert.equal(nutritionProfileSchema.safeParse({
    biologicalSex: "FEMALE",
    ageYears: 14,
    weightKg: 45,
    heightCm: 155,
    activityLevel: "LIGHT",
  }).success, false);
});
