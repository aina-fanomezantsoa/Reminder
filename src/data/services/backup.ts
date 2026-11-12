import { db } from '../db';

/** Export / import JSON de toutes les données (Should, protège contre la perte du stockage local). */
export const BACKUP_VERSION = 1;
const TABLES = ['reminders', 'reminderEvents', 'tasks', 'subtasks', 'comments', 'timeSessions', 'settings'] as const;
type TableName = (typeof TABLES)[number];

export interface BackupFile {
  app: 'reminder';
  version: number;
  exportedAt: number;
  data: Record<TableName, unknown[]>;
}

export type ImportResult = { ok: true; counts: Record<TableName, number> } | { ok: false; error: string };

export async function exportBackup(now: number = Date.now()): Promise<BackupFile> {
  const data = {} as Record<TableName, unknown[]>;
  await db.transaction('r', db.tables, async () => {
    for (const t of TABLES) data[t] = await db.table(t).toArray();
  });
  return { app: 'reminder', version: BACKUP_VERSION, exportedAt: now, data };
}

export async function exportBackupJson(now?: number): Promise<string> {
  return JSON.stringify(await exportBackup(now), null, 2);
}

/** Nom de fichier suggéré, ex. `reminder-2026-05-01.json`. */
export function backupFileName(now: number = Date.now()): string {
  const d = new Date(now);
  const p = (n: number) => String(n).padStart(2, '0');
  return `reminder-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.json`;
}

/** Remplace TOUTES les données par celles du fichier (atomique : en cas d'erreur, rien n'est modifié). */
export async function importBackupJson(json: string): Promise<ImportResult> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, error: "Le fichier n'est pas un JSON valide." };
  }
  const f = parsed as Partial<BackupFile> | null;
  if (!f || f.app !== 'reminder' || typeof f.version !== 'number' || !f.data || typeof f.data !== 'object') {
    return { ok: false, error: "Ce fichier n'est pas une sauvegarde Reminder." };
  }
  if (f.version > BACKUP_VERSION) {
    return { ok: false, error: "Cette sauvegarde provient d'une version plus récente de Reminder." };
  }
  const counts = {} as Record<TableName, number>;
  for (const t of TABLES) {
    let rows = (f.data as Record<string, unknown>)[t];
    if (t === 'timeSessions' && rows === undefined) rows = []; // absente des backups v1
    if (!Array.isArray(rows)) return { ok: false, error: `Sauvegarde incomplète : table « ${t} » manquante.` };
    const keyName = db.table(t).schema.primKey.keyPath as string;
    if (rows.some((r) => typeof r !== 'object' || r === null || typeof (r as Record<string, unknown>)[keyName] !== 'string')) {
      return { ok: false, error: `Sauvegarde invalide : table « ${t} » corrompue.` };
    }
    counts[t] = rows.length;
  }
  try {
    await db.transaction('rw', db.tables, async () => {
      for (const t of TABLES) {
        await db.table(t).clear();
        await db.table(t).bulkAdd((f.data as Record<string, unknown[]>)[t] ?? []);
      }
    });
  } catch {
    return { ok: false, error: "L'import a échoué ; vos données actuelles sont inchangées." };
  }
  return { ok: true, counts };
}
