import { z } from "zod";

export const communityCommentSchema = z.object({
  message: z.string().trim().min(1).max(600),
  parentId: z.preprocess(
    (value) => value || null,
    z.uuid().nullable(),
  ).optional(),
});
