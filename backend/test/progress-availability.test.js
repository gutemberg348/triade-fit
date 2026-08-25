import assert from "node:assert/strict";
import test from "node:test";
import { withSequentialAvailability } from "../src/services/progress.service.js";

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
