import { z } from 'zod';

export const resumeIdParam = z.object({
  id: z.string().uuid('Invalid resume ID format')
});
