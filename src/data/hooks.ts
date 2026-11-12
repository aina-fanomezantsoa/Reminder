'use client';

import { useSyncExternalStore } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import {
  loadCalendarEntries,
  loadReminderLists,
  loadTask,
  loadTaskBoard,
  loadTaskComments,
  loadTaskReminders,
  loadTasks,
  type ReminderLists,
} from './queries';
import { planSlotService } from './services/plan-slots';
import { DEFAULT_PROFILE, settingsService, type NotificationPromptState } from './services/settings';
import { completedPerDay, computeRings } from '@/domain/stats';
import { todayLocal } from '@/domain/dates';
import { getPermission, subscribePermission } from '@/notifications/permission';
import type {
  BarDatum,
  ID,
  LocalDate,
  PermissionState,
  PlanSlot,
  Profile,
  Reminder,
  ReminderOccurrence,
  RingMetric,
  Task,
  TaskBoard,
  TaskCardData,
  TaskComment,
} from '@/domain/types';

/**
 * Hooks réactifs (liveQuery, y compris entre onglets). Convention : `undefined` pendant le chargement initial.
 */

/** Dashboard. `ringsLimit` : 4 (panneau droit), 8 (page Tableau de bord). `totalTasks` : "Voir toutes les tâches (n)". */
export function useDashboard(
  ringsLimit = 4,
): { rings: RingMetric[]; completed: BarDatum[]; totalTasks: number } | undefined {
  return useLiveQuery(async () => {
    const tasks = await db.tasks.toArray();
    return {
      rings: computeRings(tasks, ringsLimit),
      completed: completedPerDay(tasks, 7, todayLocal()),
      totalTasks: tasks.length,
    };
  }, [ringsLimit]);
}

// ---------- Tâches ----------

/** Kanban : colonnes par statut, cartes triées par position, avec sous-tâches et compteurs. */
export function useTaskBoard(): TaskBoard | undefined {
  return useLiveQuery(loadTaskBoard, []);
}

/** Toutes les tâches (Gantt, listes de choix), triées par date de début. */
export function useTasks(): Task[] | undefined {
  return useLiveQuery(loadTasks, []);
}

/** Une tâche avec sous-tâches et compteurs ; `null` si inexistante ; `undefined` pendant le chargement. */
export function useTask(id: ID | undefined): TaskCardData | null | undefined {
  return useLiveQuery(() => (id ? loadTask(id) : null), [id]);
}

export function useTaskComments(taskId: ID | undefined): TaskComment[] | undefined {
  return useLiveQuery(() => (taskId ? loadTaskComments(taskId) : []), [taskId]);
}

/** Rappels liés à une tâche (fiche tâche). */
export function useTaskReminders(taskId: ID | undefined): Reminder[] | undefined {
  return useLiveQuery(() => (taskId ? loadTaskReminders(taskId) : []), [taskId]);
}

// ---------- Rappels ----------

/** `missed` = occurrences manquées non acquittées (bandeau). */
export function useReminders(): ReminderLists | undefined {
  return useLiveQuery(loadReminderLists, []);
}

/**
 * Calendrier mensuel. `monthStart` : n'importe quel jour du mois ('YYYY-MM-DD'), normalisé au 1er.
 * Les entrées couvrent la grille complète de 6 semaines lundi-dimanche (jours des mois voisins inclus).
 */
export function useCalendarEntries(
  monthStart: LocalDate,
): { tasks: Task[]; reminders: ReminderOccurrence[] } | undefined {
  return useLiveQuery(() => loadCalendarEntries(monthStart), [monthStart]);
}

// ---------- Plan du jour / profil ----------

export function usePlanSlots(date: LocalDate): PlanSlot[] | undefined {
  return useLiveQuery(() => planSlotService.listByDate(date), [date]);
}

/** Profil ; valeur par défaut tant que rien n'est enregistré. `undefined` pendant le chargement. */
export function useProfile(): Profile | undefined {
  return useLiveQuery(() => settingsService.getProfile(), []);
}
export { DEFAULT_PROFILE };

/** État de l'invite de notification (CA-R5.1). */
export function useNotificationPromptState(): NotificationPromptState | undefined {
  return useLiveQuery(() => settingsService.getNotificationPromptState(), []);
}

// ---------- Notifications ----------

/** Permission de notification, mise à jour après requestPermission, au retour sur l'onglet et si l'utilisateur change le réglage. */
export function useNotificationPermission(): PermissionState {
  return useSyncExternalStore(subscribePermission, getPermission, () => 'default' as PermissionState);
}
