import { prisma } from "../config/prisma.js";

const numberOrNull = (value) => (value == null ? null : Number(value));
export const serializeMeasurement = (item) =>
  Object.fromEntries(
    Object.entries(item).map(([key, value]) => [
      key,
      value && value.constructor?.name === "Decimal" ? Number(value) : value,
    ]),
  );

export async function createMeasurement(studentId, recordedById, data) {
  const height = numberOrNull(data.heightCm);
  const weight = numberOrNull(data.weightKg);
  const bmi =
    height && weight ? Number((weight / (height / 100) ** 2).toFixed(2)) : null;
  const measurement = await prisma.bodyMeasurement.create({
    data: {
      ...data,
      measuredAt: new Date(data.measuredAt),
      studentId,
      recordedById,
      bmi,
    },
  });
  return serializeMeasurement(measurement);
}

export async function evolution(studentId) {
  const [items, completedSessions] = await Promise.all([
    prisma.bodyMeasurement.findMany({
      where: { studentId },
      orderBy: { measuredAt: "asc" },
    }),
    prisma.lessonProgress.findMany({
      where: { studentId, completed: true, completedAt: { not: null } },
      orderBy: { completedAt: "asc" },
      select: {
        completedAt: true,
        lesson: {
          select: {
            kind: true,
            durationMinutes: true,
            calories: true,
          },
        },
      },
    }),
  ]);
  const measurements = items.map(serializeMeasurement);
  const keys = ["weightKg", "waistCm", "hipsCm", "bodyFatPercent"];
  const comparison = Object.fromEntries(
    keys.map((key) => {
      const values = measurements.filter((item) => item[key] != null);
      if (!values.length) return [key, null];
      return [
        key,
        {
          initial: values[0][key],
          current: values.at(-1)[key],
          change: Number((values.at(-1)[key] - values[0][key]).toFixed(2)),
        },
      ];
    }),
  );
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    return date;
  });
  const dateKey = (value) => {
    const date = new Date(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  const daily = days.map((date) => {
    const sessions = completedSessions.filter(
      (item) => dateKey(item.completedAt) === dateKey(date),
    );
    return {
      date: dateKey(date),
      sessions: sessions.length,
      workouts: sessions.filter((item) => item.lesson.kind === "WORKOUT").length,
      minutes: sessions.reduce(
        (total, item) => total + (item.lesson.durationMinutes || 0),
        0,
      ),
      calories: sessions
        .filter((item) => item.lesson.kind === "WORKOUT")
        .reduce((total, item) => total + (item.lesson.calories || 0), 0),
    };
  });
  const weekSessions = completedSessions.filter(
    (item) => item.completedAt >= days[0],
  );
  const workoutSessions = completedSessions.filter(
    (item) => item.lesson.kind === "WORKOUT",
  );
  const weekWorkouts = weekSessions.filter(
    (item) => item.lesson.kind === "WORKOUT",
  );
  const activeDays = new Set(
    completedSessions.map((item) => dateKey(item.completedAt)),
  ).size;
  const totalWorkouts = completedSessions.filter(
    (item) => item.lesson.kind === "WORKOUT",
  ).length;
  const achievements = [
    {
      code: "FOCUS",
      title: "Foco",
      subtitle: "7 treinos",
      current: Math.min(totalWorkouts, 7),
      target: 7,
      unlocked: totalWorkouts >= 7,
    },
    {
      code: "DISCIPLINE",
      title: "Disciplina",
      subtitle: "14 dias ativos",
      current: Math.min(activeDays, 14),
      target: 14,
      unlocked: activeDays >= 14,
    },
    {
      code: "CONSISTENCY",
      title: "Consistência",
      subtitle: "30 sessões",
      current: Math.min(completedSessions.length, 30),
      target: 30,
      unlocked: completedSessions.length >= 30,
    },
  ];
  return {
    measurements,
    comparison,
    totals: {
      sessions: completedSessions.length,
      workouts: workoutSessions.length,
      activeDays,
      minutes: completedSessions.reduce(
        (total, item) => total + (item.lesson.durationMinutes || 0),
        0,
      ),
      calories: workoutSessions.reduce(
        (total, item) => total + (item.lesson.calories || 0),
        0,
      ),
    },
    activity: {
      period: "LAST_7_DAYS",
      workouts: weekWorkouts.length,
      minutes: weekSessions.reduce(
        (total, item) => total + (item.lesson.durationMinutes || 0),
        0,
      ),
      calories: weekWorkouts.reduce(
        (total, item) => total + (item.lesson.calories || 0),
        0,
      ),
      daily,
      achievements,
    },
  };
}
