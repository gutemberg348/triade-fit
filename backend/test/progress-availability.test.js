import assert from "node:assert/strict";
import test from "node:test";
import {
  withContentModulesAvailability,
  withSequentialAvailability,
} from "../src/services/progress.service.js";

const programWith = (firstProgress, delayHours = 24) => ({
  modules: [
    {
      id: "module-1",
      lessons: [
        { id: "lesson-1", unlockDelayHours: 0, progress: firstProgress ? [firstProgress] : [] },
        { id: "lesson-2", unlockDelayHours: delayHours, progress: [] },
      ],
    },
  ],
});

test("bloqueia o próximo capítulo enquanto o anterior não foi concluído", () => {
  const result = withSequentialAvailability(programWith(null));
  assert.equal(result.modules[0].lessons[0].availability.isLocked, false);
  assert.equal(result.modules[0].lessons[1].availability.isLocked, true);
  assert.equal(result.modules[0].lessons[1].availability.unlocksAt, null);
});

test("respeita o atraso e libera o capítulo após o prazo", () => {
  const completedAt = new Date("2026-08-20T10:00:00.000Z");
  const waiting = withSequentialAvailability(
    programWith({ completed: true, completedAt }),
    new Date("2026-08-21T09:59:00.000Z"),
  );
  assert.equal(waiting.modules[0].lessons[1].availability.isLocked, true);
  assert.equal(
    waiting.modules[0].lessons[1].availability.unlocksAt,
    "2026-08-21T10:00:00.000Z",
  );

  const released = withSequentialAvailability(
    programWith({ completed: true, completedAt }),
    new Date("2026-08-21T10:00:00.000Z"),
  );
  assert.equal(released.modules[0].lessons[1].availability.isLocked, false);
});

const contentModules = (firstProgress, delayDays = 7) => [
  {
    id: "module-1",
    title: "Base",
    unlockDelayDays: 0,
    lessons: [
      { id: "lesson-1", unlockDelayHours: 0, progress: firstProgress ? [firstProgress] : [] },
    ],
  },
  {
    id: "module-2",
    title: "Evolução",
    unlockDelayDays: delayDays,
    lessons: [
      { id: "lesson-2", unlockDelayHours: 0, progress: [] },
    ],
  },
];

test("módulo seguinte exige a conclusão completa do anterior", () => {
  const result = withContentModulesAvailability(contentModules(null));
  assert.equal(result[0].availability.isLocked, false);
  assert.equal(result[1].availability.isLocked, true);
  assert.match(result[1].availability.reason, /Base/);
});

test("módulo respeita a quantidade de dias configurada pelo admin", () => {
  const completedAt = new Date("2026-08-20T10:00:00.000Z");
  const waiting = withContentModulesAvailability(
    contentModules({ completed: true, completedAt }),
    new Date("2026-08-27T09:59:00.000Z"),
  );
  assert.equal(waiting[1].availability.isLocked, true);
  assert.equal(waiting[1].availability.unlocksAt, "2026-08-27T10:00:00.000Z");

  const released = withContentModulesAvailability(
    contentModules({ completed: true, completedAt }),
    new Date("2026-08-27T10:00:00.000Z"),
  );
  assert.equal(released[1].availability.isLocked, false);
});
