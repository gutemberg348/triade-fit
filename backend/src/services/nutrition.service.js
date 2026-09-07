const routineFactors = {
  VERY_SEDENTARY: 1.2,
  LIGHTLY_ACTIVE: 1.3,
  MODERATELY_ACTIVE: 1.45,
  VERY_ACTIVE: 1.6,
  HEAVY_WORK: 1.75,
};

const weeklySessions = {
  NONE: 0,
  ONE_TWO: 1.5,
  THREE_FOUR: 3.5,
  FIVE_SIX: 5.5,
  DAILY: 7,
};

const durationMinutes = {
  UP_TO_30: 25,
  THIRTY_SIXTY: 45,
  SIXTY_NINETY: 75,
  OVER_NINETY: 105,
};

const intensityMets = {
  LIGHT: 3,
  MODERATE: 6,
  INTENSE: 9,
};

export const calculateMetabolism = ({
  biologicalSex,
  ageYears,
  weightKg,
  heightCm,
  dailyRoutine,
  exerciseFrequency,
  exerciseDuration,
  exerciseIntensity,
}) => {
  const sexAdjustment = biologicalSex === "FEMALE" ? -161 : 5;
  const basalCalories = Math.round(
    10 * Number(weightKg) + 6.25 * Number(heightCm) - 5 * Number(ageYears) + sexAdjustment,
  );
  const routineCalories = basalCalories * routineFactors[dailyRoutine];
  const sessions = weeklySessions[exerciseFrequency];
  const exerciseCaloriesPerDay = sessions
    ? (
        (intensityMets[exerciseIntensity] - 1)
        * 3.5
        * Number(weightKg)
        / 200
        * durationMinutes[exerciseDuration]
        * sessions
      ) / 7
    : 0;
  const dailyCalorieTarget = Math.round(
    Math.min(basalCalories * 2.4, routineCalories + exerciseCaloriesPerDay),
  );
  const activityRatio = dailyCalorieTarget / basalCalories;
  const activityLevel = activityRatio < 1.3
    ? "SEDENTARY"
    : activityRatio < 1.46
      ? "LIGHT"
      : activityRatio < 1.65
        ? "MODERATE"
        : "ACTIVE";
  return { basalCalories, dailyCalorieTarget, activityLevel };
};
