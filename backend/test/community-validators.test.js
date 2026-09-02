import test from "node:test";
import assert from "node:assert/strict";
import { communityCommentSchema } from "../src/validators/community.validators.js";

test("comentário aceita texto e resposta opcional", () => {
  const result = communityCommentSchema.safeParse({
    message: "Também consegui fazer assim!",
    parentId: "6377515b-a1f0-492c-85e6-62e15d495c35",
  });
  assert.equal(result.success, true);
});

test("comentário vazio é recusado", () => {
  const result = communityCommentSchema.safeParse({ message: "   " });
  assert.equal(result.success, false);
  assert.equal(result.error.issues[0].path[0], "message");
});
