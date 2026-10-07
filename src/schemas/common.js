import { z } from 'zod';

export const idParams = z.object({
  body: z.unknown().optional(),
  params: z.object({ id: z.coerce.number().int().positive() }),
  query: z.unknown().optional(),
});

export const paginationQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
