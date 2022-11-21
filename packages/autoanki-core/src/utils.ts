import { z } from 'zod';

export const tagSchema = z
  .string()
  .min(1)
  .refine((tag) => !tag.includes(' '), {
    message: 'Anki tags must not contain spaces',
  });
