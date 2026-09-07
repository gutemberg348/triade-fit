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
    dailyRoutine: "LIGHTLY_ACTIVE",
    exerciseFrequency: "ONE_TWO",
    exerciseDuration: "THIRTY_SIXTY",
    exerciseIntensity: "MODERATE",
  });
  assert.deepEqual(result, { basalCalories: 1420, dailyCalorieTarget: 1905, activityLevel: "LIGHT" });
});

test("perfil metabólico valida idade, medidas e atividade", () => {
  const valid = nutritionProfileSchema.safeParse({
    biologicalSex: "MALE",
    ageYears: 35,
    weightKg: 82,
    heightCm: 178,
    dailyRoutine: "MODERATELY_ACTIVE",
    exerciseFrequency: "THREE_FOUR",
    exerciseDuration: "THIRTY_SIXTY",
    exerciseIntensity: "MODERATE",
  });
  assert.equal(valid.success, true);
  assert.equal(nutritionProfileSchema.safeParse({
    biologicalSex: "FEMALE",
    ageYears: 14,
    weightKg: 45,
    heightCm: 155,
    dailyRoutine: "LIGHTLY_ACTIVE",
    exerciseFrequency: "NONE",
    exerciseDuration: null,
    exerciseIntensity: null,
  }).success, false);
});

test("perfil exige duração e intensidade somente quando há exercício", () => {
  const base = {
    biologicalSex: "FEMALE",
    ageYears: 30,
    weightKg: 70,
    heightCm: 165,
    dailyRoutine: "VERY_SEDENTARY",
  };
  assert.equal(nutritionProfileSchema.safeParse({
    ...base,
    exerciseFrequency: "NONE",
    exerciseDuration: null,
    exerciseIntensity: null,
  }).success, true);
  assert.equal(nutritionProfileSchema.safeParse({
    ...base,
    exerciseFrequency: "ONE_TWO",
    exerciseDuration: null,
    exerciseIntensity: null,
  }).success, false);
});
