const activityFactors = {
  SEDENTARY: 1.2,
  LIGHT: 1.375,
  MODERATE: 1.55,
  ACTIVE: 1.725,
};

export const calculateMetabolism = ({
  biologicalSex,
  ageYears,
  weightKg,
  heightCm,
  activityLevel,
}) => {
  const sexAdjustment = biologicalSex === "FEMALE" ? -161 : 5;
  const basalCalories = Math.round(
    10 * Number(weightKg) + 6.25 * Number(heightCm) - 5 * Number(ageYears) + sexAdjustment,
  );
  const dailyCalorieTarget = Math.round(
    basalCalories * activityFactors[activityLevel],
  );
  return { basalCalories, dailyCalorieTarget };
};
