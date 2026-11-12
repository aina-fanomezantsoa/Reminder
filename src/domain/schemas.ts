import { z } from 'zod';
import { isValidLocalDate, isValidLocalTime } from './dates';

const title = z
  .string({ error: 'Le titre est obligatoire.' })
  .trim()
  .min(1, 'Le titre est obligatoire.')
  .max(200, 'Le titre ne doit pas dépasser 200 caractères.');

const localDate = (msg: string) =>
  z.string({ error: msg }).refine(isValidLocalDate, { message: msg });
const localTime = (msg: string) =>
  z.string({ error: msg }).refine(isValidLocalTime, { message: msg });

const optionalId = z.string().min(1).optional();

export const recurrenceSchema = z.enum(['none', 'daily', 'weekly', 'monthly'], {
  error: 'Récurrence invalide.',
});
export const taskStatusSchema = z.enum(['draft', 'in_progress', 'editing', 'done'], {
  error: 'Statut invalide.',
});

// ---------- Rappels ----------
export const reminderInputSchema = z.object({
  title,
  note: z.string().max(2000, 'La note ne doit pas dépasser 2000 caractères.').optional(),
  startDate: localDate('Date invalide.'),
  time: localTime('Heure invalide (format HH:mm).'),
  recurrence: recurrenceSchema.default('none'),
  taskId: optionalId,
});

// ---------- Tâches ----------
export const taskBaseSchema = z.object({
  title,
  startDate: localDate('La date de début est obligatoire.'),
  endDate: localDate('La date de fin est obligatoire.'),
  status: taskStatusSchema.optional(),
  progress: z
    .number({ error: 'La progression doit être un nombre.' })
    .int('La progression doit être un entier.')
    .min(0, 'La progression doit être comprise entre 0 et 100.')
    .max(100, 'La progression doit être comprise entre 0 et 100.')
    .optional(),
  starred: z.boolean().optional(),
});

const endAfterStart = {
  message: 'La date de fin ne peut pas précéder la date de début.',
  path: ['endDate'],
};

export const taskInputSchema = taskBaseSchema.refine(
  (t) => !isValidLocalDate(t.startDate) || !isValidLocalDate(t.endDate) || t.endDate >= t.startDate,
  endAfterStart,
);
/** Patch partiel : la cohérence des dates est revalidée par le service sur l'objet fusionné. */
export const taskPatchSchema = taskBaseSchema.partial();

export const subtaskTitleSchema = z.object({ title });
export const commentSchema = z.object({
  text: z
    .string({ error: 'Le commentaire est obligatoire.' })
    .trim()
    .min(1, 'Le commentaire est obligatoire.')
    .max(2000, 'Le commentaire ne doit pas dépasser 2000 caractères.'),
});

// ---------- Utilitaire de validation -> Result ----------
export function validate<S extends z.ZodType>(
  schema: S,
  input: unknown,
): { ok: true; value: z.output<S> } | { ok: false; errors: Record<string, string> } {
  const parsed = schema.safeParse(input);
  if (parsed.success) return { ok: true, value: parsed.data };
  const errors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const key = String(issue.path[0] ?? '_');
    if (!(key in errors)) errors[key] = issue.message;
  }
  return { ok: false, errors };
}
