import { z } from "zod";

export const idParams = z.object({ id: z.uuid() });
export const optionalUrl = z
  .union([z.url(), z.literal("")])
  .optional()
  .transform((value) => value || null);
export const nullableNumber = (max = 500) =>
  z.preprocess(
    (value) =>
      value === "" || value === null || value === undefined
        ? null
        : Number(value),
    z.number().positive().max(max).nullable(),
  );

export const paginationQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
  status: z.string().optional(),
});
