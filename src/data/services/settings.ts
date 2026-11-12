import { z } from 'zod';
import { db } from '../db';
import { validate } from '@/domain/schemas';
import type { Profile, Result } from '@/domain/types';

export const DEFAULT_PROFILE: Profile = { displayName: 'Moi' };

/**
 * État de l'invite de notification (CA-R5.1) :
 *  - 'pending'   : l'invite n'a pas encore été montrée / traitée ;
 *  - 'dismissed' : l'utilisateur a fermé l'invite sans répondre ("plus tard") ;
 *  - 'answered'  : le navigateur a répondu (accordée ou refusée), ne plus afficher l'invite.
 */
export type NotificationPromptState = 'pending' | 'dismissed' | 'answered';

const PROFILE_KEY = 'profile';
const PROMPT_KEY = 'notificationPrompt';

const profileSchema = z.object({
  displayName: z
    .string({ error: 'Le nom est obligatoire.' })
    .trim()
    .min(1, 'Le nom est obligatoire.')
    .max(60, 'Le nom ne doit pas dépasser 60 caractères.'),
});

export const settingsService = {
  async getProfile(): Promise<Profile> {
    const row = await db.settings.get(PROFILE_KEY);
    const parsed = profileSchema.safeParse(row?.value);
    return parsed.success ? parsed.data : { ...DEFAULT_PROFILE };
  },

  async setProfile(input: Profile): Promise<Result<Profile, Profile>> {
    const v = validate(profileSchema, input);
    if (!v.ok) return v;
    await db.settings.put({ key: PROFILE_KEY, value: v.value });
    return { ok: true, value: v.value };
  },

  async getNotificationPromptState(): Promise<NotificationPromptState> {
    const row = await db.settings.get(PROMPT_KEY);
    return row?.value === 'dismissed' || row?.value === 'answered' ? row.value : 'pending';
  },

  async setNotificationPromptState(state: NotificationPromptState): Promise<void> {
    await db.settings.put({ key: PROMPT_KEY, value: state });
  },
};
