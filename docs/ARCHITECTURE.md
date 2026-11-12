# ARCHITECTURE : Reminder (MVP)

Sources : docs/BRIEF.md, docs/SPEC.md, docs/reference/1.png. Rédigé par l'architecte. Aucun code ici, uniquement des choix et des contrats.

## 0. Décisions client (fermes, BRIEF.md "Arbitrages client")

| Décision                                                                                                             | Conséquence d'architecture                                                                                                      |
| -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Notifications : application ouverte suffisante, pas de push onglet fermé ; rappels manqués affichés à la réouverture | Aucun Web Push, aucun serveur, aucune base distante, aucun cron. Scheduler local uniquement. Journal `missed` conservé.         |
| Rappel lié à une tâche : oui, optionnel                                                                              | `Reminder.taskId?` (index) ; le formulaire de rappel propose une tâche existante ; la fiche tâche liste ses rappels.            |
| Dates début/fin des tâches obligatoires                                                                              | `startDate` et `endDate` non optionnelles. Toute tâche apparaît dans le Gantt et le calendrier : plus de cas "tâche sans date". |
| Anneaux d'efficacité : progression par tâche/projet                                                                  | Un anneau par tâche = sa `progress`. Plus de métriques globales à définir.                                                      |

## 1. Principes directeurs

1. **Zéro serveur applicatif** : tout tourne dans le navigateur, les données sont locales (IndexedDB). Coût nul, aucune base à gérer, aucun compte (brief : un seul utilisateur).
2. **Next.js en export statique** (`output: 'export'`) déployé sur Vercel Hobby : aucune fonction serverless, aucun cron, donc aucune limite du plan gratuit à surveiller.
3. **Le "backend" est une couche TypeScript locale** (`domain/`, `data/`, `notifications/`) exposée au frontend via des interfaces typées. Si le client tranche un jour pour un vrai serveur, seule cette couche change, pas les écrans.
4. **Peu de dépendances** : une seule lib pour le glisser-déposer, une pour la base locale, une pour les dates, une pour la validation. Gantt, calendrier, anneaux et histogramme sont faits maison (le style de la maquette est très spécifique et les libs standards le contraignent).

## 2. Stack retenue

| Besoin                 | Choix                                                                            | Justification                                                                                                                                                                                                                            |
| ---------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework              | Next.js (App Router) + TypeScript strict                                         | Imposé par le brief. Composants `"use client"` pour tout ce qui touche aux données (IndexedDB n'existe pas côté serveur).                                                                                                                |
| Style                  | Tailwind CSS                                                                     | Imposé par la demande ; adapté aux cartes arrondies, ombres douces et couleurs pastel de la maquette.                                                                                                                                    |
| Stockage               | **IndexedDB via Dexie** (+ `dexie-react-hooks`)                                  | Voir section 4.                                                                                                                                                                                                                          |
| Dates                  | `date-fns`                                                                       | Petit, tree-shakable, `addMonths` gère déjà le clamp de fin de mois. Pas de Moment/Luxon.                                                                                                                                                |
| Validation             | `zod`                                                                            | Un schéma par formulaire, messages d'erreur par champ (ET-6), réutilisable par les services.                                                                                                                                             |
| Glisser-déposer Kanban | **`@dnd-kit/core` + `@dnd-kit/sortable`**                                        | Léger, maintenu, accessible clavier/tactile, gère le réordonnancement (AMB-12). Alternative maison rejetée : trop de cas limites (scroll, tactile, annulation). Le bouton "changer de statut" (CA-K2.4) reste obligatoire en complément. |
| Gantt                  | **Maison** (CSS grid + barres positionnées)                                      | Lecture seule (AMB-14), une ligne par tâche, échelle en jours : ~150 lignes. Frappe-gantt / gantt-task-react imposent leur style et pèsent plus que le besoin.                                                                           |
| Calendrier             | **Maison**, grille mensuelle avec `date-fns`                                     | Vue mois seule (AMB-15) : une grille 7 colonnes. FullCalendar est lourd et difficile à habiller comme la maquette.                                                                                                                       |
| Graphiques             | **Maison, SVG** (anneaux = cercles `stroke-dasharray`, histogramme = rectangles) | Deux graphiques simples. Recharts/Chart.js ajoutent 100 Ko+ pour un rendu moins fidèle.                                                                                                                                                  |
| Icônes                 | `lucide-react`                                                                   | Étoile, trombone, bulle, etc., tree-shakable.                                                                                                                                                                                            |
| IDs                    | `crypto.randomUUID()`                                                            | Natif, pas de dépendance.                                                                                                                                                                                                                |
| PWA / Service Worker   | `public/sw.js` écrit à la main + `public/manifest.webmanifest`                   | Besoin minimal (afficher la notification, gérer le clic). `next-pwa`/Workbox inutiles et fragiles avec l'App Router.                                                                                                                     |
| Tests                  | Vitest (domaine : récurrence, règles, stats) ; Playwright (recette, géré par qa) | Le gros du risque est dans la logique pure, facile à tester sans navigateur.                                                                                                                                                             |

Version : Next.js et Tailwind en dernière version stable au moment de l'initialisation (à figer dans `package.json` par le devops).

## 3. Arborescence

```
Reminder/
├─ docs/                         BRIEF, SPEC, ARCHITECTURE, DESIGN, reference/
├─ public/
│  ├─ sw.js                      Service Worker (notifications, clic)       [backend]
│  ├─ manifest.webmanifest       PWA installable                            [backend]
│  └─ icons/
├─ src/
│  ├─ app/                                                                   [frontend]
│  │  ├─ layout.tsx              Coquille : sidebar gauche, panneau droit, providers
│  │  ├─ page.tsx                Dashboard (anneaux + histogramme en grand)
│  │  ├─ tasks/page.tsx          Fil d'Ariane "Tasks > Today" : Gantt compact + Kanban (cf. maquette)
│  │  ├─ planning/page.tsx       Onglets Gantt | Calendrier
│  │  ├─ reminders/page.tsx      Liste à venir / passés / manqués + formulaire
│  │  └─ globals.css             Tokens Tailwind (couleurs, rayons, ombres) fournis par le designer
│  ├─ components/                                                            [frontend]
│  │  ├─ ui/                     Button, Modal, ConfirmDialog, Field, ProgressBar, EmptyState, Avatar
│  │  ├─ layout/                 Sidebar, Breadcrumb, RightPanel
│  │  ├─ tasks/                  KanbanBoard, KanbanColumn, TaskCard, TaskForm, SubtaskList, StatusMenu
│  │  ├─ planning/               GanttChart, CalendarMonth, DayCell
│  │  ├─ reminders/              ReminderList, ReminderForm, NotificationBanner, MissedBanner
│  │  ├─ plan-day/               PlanDayPanel, SlotForm
│  │  └─ dashboard/              EfficiencyRings, CompletedHistogram, ProfileCard
│  ├─ domain/                    Logique pure, sans React ni IndexedDB       [backend]
│  │  ├─ types.ts                CONTRAT PARTAGÉ (section 6), figé en premier
│  │  ├─ schemas.ts              Schémas zod (ReminderInput, TaskInput, SlotInput...)
│  │  ├─ recurrence.ts           nextOccurrenceAfter, occurrencesBetween
│  │  ├─ task-rules.ts           Règles statut/progression (AMB-07, AMB-09)
│  │  ├─ stats.ts                computeRings, completedPerDay
│  │  └─ dates.ts                Helpers LocalDate/LocalTime <-> epoch ms
│  ├─ data/                      Persistance + services + hooks              [backend]
│  │  ├─ db.ts                   Schéma Dexie, versions, index, seed vide
│  │  ├─ services/               reminders.ts, tasks.ts, plan-slots.ts, settings.ts, backup.ts
│  │  └─ hooks.ts                useReminders, useTaskBoard, useCalendarEntries, ... (liveQuery)
│  ├─ notifications/                                                         [backend]
│  │  ├─ scheduler.ts            Boucle de déclenchement + rattrapage
│  │  ├─ permission.ts           État et demande de permission
│  │  ├─ leader.ts               Web Locks : un seul onglet planifie
│  │  └─ register-sw.ts          Enregistrement du Service Worker
│  └─ lib/                       cn(), constantes (statuts, libellés français)
├─ tests/                        unit/ (Vitest), e2e/ (Playwright)
├─ next.config.ts                output: 'export'
└─ package.json
```

Règle de dépendance : `app` et `components` n'importent que `data/hooks`, `data/services` et `domain/types` (jamais `db.ts` directement). `domain/` n'importe rien d'autre. Cette frontière rend le stockage remplaçable.

## 4. Stockage retenu : IndexedDB (Dexie), local au navigateur

**Choix** : IndexedDB via Dexie. **Rejetés** : localStorage (5 Mo, synchrone, pas de requêtes, pas de Blob pour d'éventuelles pièces jointes) ; base distante gratuite (Supabase/Neon/Turso : compte, secrets, auth, latence, et impose un serveur pour protéger les données alors qu'il n'y a pas de comptes).

Pourquoi Dexie plutôt qu'IndexedDB brut : API lisible, index composés, migrations par version, et surtout `liveQuery` qui re-rend les composants à chaque écriture, **y compris depuis un autre onglet**. C'est ce qui satisfait ET-2 (cohérence entre vues sans rechargement) sans store global (pas de Redux/Zustand).

Conséquences à assumer (à communiquer au client, voir AMB-20) :

- Données **sur un seul appareil / un seul navigateur**, pas de synchronisation.
- Vider les données du site efface tout. **Safari** purge le stockage des sites non installés sans interaction pendant 7 jours : demander `navigator.storage.persist()` au démarrage et recommander l'installation PWA.
- Recommandation (Should, hors Must) : **export/import JSON** (`data/services/backup.ts`), coût faible, protège contre la perte. Le SPEC dit "pas d'export" en hypothèse ; je le signale comme risque, pas comme exigence.

### Tables et index

| Table            | Clé / index                                                      | Contenu                                                               |
| ---------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------- |
| `reminders`      | `id`, `nextDueAt`, `taskId`                                      | Rappels et leur règle de récurrence                                   |
| `reminderEvents` | `id` (= `${reminderId}:${dueAt}`), `reminderId`, `status`        | Journal des occurrences déclenchées / manquées (anti-doublon, AMB-03) |
| `tasks`          | `id`, `[status+position]`, `startDate`, `endDate`, `completedAt` | Tâches                                                                |
| `subtasks`       | `id`, `taskId`                                                   | Sous-tâches (1 niveau)                                                |
| `comments`       | `id`, `taskId`                                                   | Commentaires texte (AMB-08)                                           |
| `attachments`    | `id`, `taskId`                                                   | Pièces jointes en `Blob` (**créée seulement si AMB-08 les valide**)   |
| `planSlots`      | `id`, `date`                                                     | Créneaux du plan du jour                                              |
| `settings`       | `key`                                                            | Profil, état de l'invite de notification                              |

## 5. Modèle de données

Principe de dates : les rappels et créneaux sont saisis en **heure locale** (ET-3). On stocke donc `date: 'YYYY-MM-DD'` et `time: 'HH:mm'` (pas un instant UTC), pour que "09:00" reste "09:00" après un changement d'heure été/hiver. On en dérive `nextDueAt` (epoch ms) uniquement pour indexer et comparer.

```ts
type ID = string; // UUID
type LocalDate = string; // 'YYYY-MM-DD'
type LocalTime = string; // 'HH:mm'
type EpochMs = number;

// ---------- Rappels ----------
type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly';

interface Reminder {
  id: ID;
  title: string; // 1..200, non vide après trim
  note?: string;
  startDate: LocalDate; // date de la 1re occurrence ; sert d'ancre
  time: LocalTime;
  recurrence: Recurrence; // défaut 'none'
  taskId?: ID; // lien optionnel vers une tâche (décision client) ; retiré si la tâche est supprimée
  nextDueAt: EpochMs | null; // prochaine occurrence non traitée ; null si terminé (non récurrent, déjà déclenché)
  createdAt: EpochMs;
  updatedAt: EpochMs;
}

// Une occurrence traitée (déclenchée ou manquée). La clé primaire `${reminderId}:${dueAt}`
// rend l'insertion atomique : un 2e onglet qui tente de notifier la même occurrence échoue (CA-R5.4).
interface ReminderEvent {
  id: string;
  reminderId: ID;
  dueAt: EpochMs;
  status: 'fired' | 'missed';
  handledAt: EpochMs;
  acknowledged: boolean; // le bandeau "manqué" a été fermé
}

// ---------- Tâches ----------
type TaskStatus = 'draft' | 'in_progress' | 'editing' | 'done'; // libellés FR dans lib/constants

interface Task {
  id: ID;
  title: string;
  status: TaskStatus; // défaut 'draft'
  progress: number; // entier 0..100, défaut 0
  starred: boolean;
  startDate: LocalDate; // obligatoires (décision client) : toute tâche est dans le Gantt
  endDate: LocalDate; // >= startDate
  position: number; // ordre dans la colonne (AMB-12) ; réel pour insérer entre deux cartes
  completedAt?: EpochMs; // posé au passage à 'done', retiré sinon (histogramme)
  createdAt: EpochMs;
  updatedAt: EpochMs;
}

interface Subtask {
  id: ID;
  taskId: ID;
  title: string;
  done: boolean;
  position: number;
}
interface TaskComment {
  id: ID;
  taskId: ID;
  text: string;
  createdAt: EpochMs;
}
interface Attachment {
  id: ID;
  taskId: ID;
  name: string;
  mimeType: string;
  size: number;
  blob: Blob;
  createdAt: EpochMs;
} // conditionnel AMB-08

// Compteurs DÉRIVÉS (count sur les tables), jamais stockés : pas d'incohérence possible (US-T6).
interface TaskCardData extends Task {
  subtasks: Subtask[];
  commentCount: number;
  attachmentCount: number;
}

// ---------- Plan du jour (chronomètre ; remplace les créneaux PlanSlot, supprimés) ----------
interface TimeSession {
  id: ID;
  taskId: ID;
  start: EpochMs;
  end?: EpochMs; // absent = en cours. Table `timeSessions` (Dexie v2), pause = settings.pausedTaskId
}
// Services : timerService (start/pause/stop/resetDay), domain/time-sessions.ts (splitByDay, totalMs, dayMsByTask).

// ---------- Réglages ----------
interface Profile {
  displayName: string;
} // avatar par défaut, non stocké (AMB-19)
```

### Récurrence (`domain/recurrence.ts`)

- Occurrence n°k calculée **depuis l'ancre `startDate`**, jamais depuis l'occurrence précédente : `daily` = +k jours, `weekly` = +7k jours, `monthly` = `startDate + k mois` avec clamp au dernier jour du mois (`addMonths` de date-fns), donc le 31 janvier donne 28/29 février puis revient au 31 mars (CA-R4.4). Les années bissextiles sont couvertes par ce calcul.
- `nextOccurrenceAfter(reminder, afterMs)` et `occurrencesBetween(reminder, fromDate, toDate)` (pour le calendrier, CA-P2.3). Fonctions pures, testées par Vitest.
- Pas de bibliothèque `rrule` : 3 fréquences fixes.

## 6. Stratégie de notifications

### Ce qui est garanti (MVP) : décision client ferme

**Application ouverte (onglet ouvert, visible ou non)** : notification à l'heure dite, tolérance 60 s (CA-R5.2). Pas de push onglet fermé, pas de service serveur. Les rappels manqués sont affichés à la réouverture.

### Mécanisme

1. **Permission** : bandeau explicatif, puis `Notification.requestPermission()` sur clic (CA-R5.1). États gérés : `default`, `granted`, `denied`, `unsupported` (CA-R5.3).
2. **Scheduler** (`notifications/scheduler.ts`), actif tant que l'app est ouverte :
   - cherche le plus petit `nextDueAt` (index) et arme un `setTimeout` vers cette échéance, plus un contrôle de sécurité toutes les 30 s ;
   - se ré-évalue sur `visibilitychange`, `focus`, `online` et à chaque modification d'un rappel (via liveQuery), ce qui couvre la veille de l'ordinateur et la modification d'heure (CA-R2.3) ;
   - compare toujours à `Date.now()` (jamais de compteurs cumulés, sensibles au throttling).
3. **Déclenchement** : pour chaque occurrence échue, une transaction Dexie insère `ReminderEvent(id=reminderId:dueAt)` ; si l'insertion réussit, on affiche la notification et on avance `nextDueAt` à l'occurrence suivante (ou `null` si non récurrent). Si la clé existe déjà, un autre onglet l'a traitée : on ne fait rien.
4. **Plusieurs onglets** : `navigator.locks.request('reminder-scheduler', { ifAvailable: true })` désigne un onglet leader (`leader.ts`) ; la clé primaire de `ReminderEvent` reste la garantie finale.
5. **Affichage** : `registration.showNotification(titre, { body: note, tag: reminderId:dueAt })` via le Service Worker (obligatoire sur Android/Chrome mobile, fonctionne sur bureau) ; repli sur `new Notification()` si aucun SW. Le `tag` évite aussi un doublon visuel côté OS. Le clic est géré dans `sw.js` (focus ou ouverture de `/reminders`).
6. **Occurrences manquées (AMB-03)** : au démarrage et au retour de veille, toute occurrence en retard de plus de 5 min (constante `LATE_GRACE_MS`, réglable) n'émet pas de notification : elle est journalisée `missed` et signalée par un bandeau dans l'app (US-R6). Pour un rappel récurrent ayant plusieurs occurrences manquées, seule la plus récente est journalisée (évite de submerger l'utilisateur) et `nextDueAt` saute à la prochaine occurrence future. En retard de 5 min ou moins : notification normale.
7. **Message honnête à l'utilisateur** (CA-R5.5) : l'écran Rappels affiche en permanence "Les notifications ne sont envoyées que lorsque Reminder est ouvert dans un onglet du navigateur."

### Limites connues, onglet fermé et navigateurs

| Limite                                 | Détail                                                                                                                                                                                                                                                                          |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Onglet / navigateur fermé              | Aucune notification. Un Service Worker est arrêté par le navigateur après quelques secondes d'inactivité : il ne peut pas servir de minuterie.                                                                                                                                  |
| API de planification locale            | `showTrigger` (Notification Triggers) a été abandonnée par Chrome : ne pas s'y fier.                                                                                                                                                                                            |
| Periodic Background Sync               | Chrome uniquement, PWA installée, période minimale d'environ 12 h, non fiable : inutilisable pour une heure précise.                                                                                                                                                            |
| Throttling des onglets en arrière-plan | Chrome ralentit les minuteries d'un onglet caché (jusqu'à environ 1 par minute après 5 min). La tolérance de 60 s est tenable mais juste ; **spike à faire** : tester une minuterie dans un Dedicated Worker (non soumise au même throttling) si le retard mesuré dépasse 60 s. |
| Veille de l'ordinateur                 | L'échéance passe pendant la veille : traitée au réveil (point 6).                                                                                                                                                                                                               |
| Safari / iOS                           | Notifications Web : Safari bureau OK ; iOS seulement pour une PWA ajoutée à l'écran d'accueil (iOS 16.4+). Le MVP vise le bureau (AMB-20).                                                                                                                                      |
| Permission refusée                     | Repli : liste et bandeau dans l'app, aucun contournement possible.                                                                                                                                                                                                              |

### Hors périmètre (écarté par le client)

Le Web Push (onglet fermé) est exclu. Pour mémoire : il exigerait un serveur, une base distante et un déclencheur à la minute, or les cron de Vercel Hobby sont limités à 1 exécution par jour. Aucune de ces pièces n'est construite ni prévue.

Le Service Worker est conservé uniquement pour `showNotification` et la gestion du clic (fiabilité Android/Chrome) ; le manifest PWA devient un Should (installation, atténuation de la purge Safari).

## 7. Contrats frontend / backend

Le frontend ne connaît que ces types et ces hooks. `domain/types.ts` est écrit **en premier**, puis figé : toute modification passe par l'architecte.

```ts
// ---- Convention d'erreur : validation par champ (ET-6), jamais d'exception pour une saisie invalide
type FieldErrors<T> = Partial<Record<keyof T & string, string>>; // message FR affichable
type Result<T, I = unknown> = { ok: true; value: T } | { ok: false; errors: FieldErrors<I> };

// ---- Rappels
interface ReminderInput {
  title: string;
  note?: string;
  startDate: LocalDate;
  time: LocalTime;
  recurrence: Recurrence;
  taskId?: ID; // doit exister, sinon erreur sur le champ
}
interface ReminderOccurrence {
  reminderId: ID;
  title: string;
  at: EpochMs;
  recurring: boolean;
} // pour le calendrier

interface ReminderService {
  create(input: ReminderInput): Promise<Result<Reminder, ReminderInput>>; // refuse date/heure passée (AMB-04)
  update(id: ID, input: ReminderInput): Promise<Result<Reminder, ReminderInput>>; // série entière (AMB-05)
  remove(id: ID): Promise<void>; // série entière
  occurrencesBetween(from: LocalDate, to: LocalDate): Promise<ReminderOccurrence[]>;
  acknowledgeMissed(eventId: string): Promise<void>;
}

// ---- Tâches
interface TaskInput {
  title: string;
  startDate: LocalDate;
  endDate: LocalDate; // obligatoires
  status?: TaskStatus;
  progress?: number;
  starred?: boolean;
}
type TaskBoard = Record<TaskStatus, TaskCardData[]>; // déjà trié par position

interface TaskService {
  create(input: TaskInput): Promise<Result<Task, TaskInput>>;
  update(id: ID, patch: Partial<TaskInput>): Promise<Result<Task, TaskInput>>; // applique task-rules (Terminé => 100 %, completedAt)
  remove(id: ID): Promise<void>; // cascade sous-tâches, commentaires, pièces jointes ; détache créneaux et rappels (ils sont conservés, taskId retiré)
  remindersOf(taskId: ID): Promise<Reminder[]>; // rappels liés, pour la fiche tâche
  move(id: ID, status: TaskStatus, beforeId?: ID): Promise<void>; // Kanban : statut + position ; même colonne = réordonnancement
  toggleStar(id: ID): Promise<void>;
  addSubtask(taskId: ID, title: string): Promise<Result<Subtask, { title: string }>>;
  renameSubtask(id: ID, title: string): Promise<Result<Subtask, { title: string }>>;
  toggleSubtask(id: ID): Promise<void>;
  removeSubtask(id: ID): Promise<void>;
  addComment(taskId: ID, text: string): Promise<Result<TaskComment, { text: string }>>;
}

// ---- Plan du jour
interface TimerService {
  start(taskId: ID): Promise<Result<{ id: ID }, { taskId: ID }>>; // clôt toute session ouverte
  pause(): Promise<void>;
  stop(): Promise<void>;
  resetDay(taskId: ID, date: LocalDate): Promise<void>;
}

// ---- Statistiques (fonctions pures, domain/stats.ts)
// Un anneau par tâche : percent = task.progress (décision client). Plafond d'affichage (ex. 4) et choix des tâches
// (favorites, puis en cours, puis plus récentes) décidés par le designer ; la fonction applique `limit`.
interface RingMetric {
  taskId: ID;
  label: string /*titre de la tâche*/;
  percent: number /*0..100*/;
}
interface BarDatum {
  label: string;
  date: LocalDate;
  count: number;
}
type ComputeRings = (tasks: Task[], limit: number) => RingMetric[]; // [] si aucune tâche : état vide, pas de division
type CompletedPerDay = (tasks: Task[], days: number, today: LocalDate) => BarDatum[];

// ---- Notifications
type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported';
interface NotificationService {
  permission(): PermissionState;
  requestPermission(): Promise<PermissionState>; // à appeler sur clic utilisateur
  start(): void; // lance le scheduler (appelé une fois par le layout)
  stop(): void;
}

// ---- Hooks livrés au frontend (data/hooks.ts), tous réactifs via liveQuery
// `undefined` pendant le chargement initial (le frontend affiche un squelette), puis la valeur.
declare function useReminders(): { upcoming: Reminder[]; past: Reminder[]; missed: ReminderEvent[] } | undefined;
declare function useTaskBoard(): TaskBoard | undefined;
declare function useTasks(): Task[] | undefined; // Gantt (toutes les tâches ont des dates)
declare function useCalendarEntries(monthStart: LocalDate): { tasks: Task[]; reminders: ReminderOccurrence[] } | undefined;
declare function usePlanSlots(date: LocalDate): PlanSlot[] | undefined;
declare function useDashboard(): { rings: RingMetric[]; completed: BarDatum[] } | undefined;
declare function useProfile(): Profile | undefined;
declare function useNotificationPermission(): PermissionState;
```

### Règles de métier portées par le backend (pas par les composants)

- Validation : titre non vide après `trim` (<= 200), progression entier 0..100, `endDate >= startDate`, créneau `end > start`.
- `Terminé` force `progress = 100` et pose `completedAt` ; quitter `done` retire `completedAt` et laisse la progression (AMB-07).
- Suppression en cascade d'une tâche ; les créneaux liés perdent leur `taskId` et gardent leur titre.
- Les services sont la seule voie d'écriture : le frontend ne touche jamais Dexie.

## 8. Découpage des tâches

Propriété des dossiers : **Frontend** = `src/app`, `src/components`, `src/lib` ; **Backend** = `src/domain`, `src/data`, `src/notifications`, `public/sw.js`, `public/manifest.webmanifest`. Le contrat de la section 7 est la seule surface commune.

### Backend

| ID  | Tâche                                                          | Livrable                                           | Dépend de |
| --- | -------------------------------------------------------------- | -------------------------------------------------- | --------- |
| B1  | Types partagés + schémas zod                                   | `domain/types.ts`, `schemas.ts` (**contrat figé**) | :         |
| B2  | Dexie : tables, index, versions, `persist()`                   | `data/db.ts`                                       | B1        |
| B3  | Service tâches + règles + sous-tâches + commentaires           | `task-rules.ts`, `services/tasks.ts`               | B1, B2    |
| B4  | Hooks tâches (board, dates)                                    | `data/hooks.ts` (partie tâches)                    | B3        |
| B5  | Récurrence pure + tests                                        | `recurrence.ts` + Vitest                           | B1        |
| B6  | Service rappels + occurrences calendrier                       | `services/reminders.ts`                            | B2, B5    |
| B7  | Scheduler, leader, permission, rattrapage "manqué"             | `notifications/*`                                  | B6        |
| B8  | Service Worker minimal (affichage + clic) ; manifest en Should | `sw.js`, `register-sw.ts`                          | B7        |
| B9  | Service créneaux + détection de chevauchement                  | `services/plan-slots.ts`                           | B2        |
| B10 | Stats (anneaux, histogramme) + hook dashboard                  | `stats.ts`                                         | B3        |
| B11 | Hooks rappels, calendrier, plan du jour, profil                | `data/hooks.ts` (reste)                            | B6, B9    |
| B12 | (Should) export/import JSON                                    | `services/backup.ts`                               | B2        |

### Frontend

| ID  | Tâche                                                                                    | Livrable                                | Dépend de                   |
| --- | ---------------------------------------------------------------------------------------- | --------------------------------------- | --------------------------- |
| F1  | Init Next/Tailwind, tokens du designer, coquille (sidebar, fil d'Ariane, panneau droit)  | `app/layout.tsx`, `components/layout`   | DESIGN.md                   |
| F2  | Composants UI de base (Modal, ConfirmDialog, Field avec erreur, ProgressBar, EmptyState) | `components/ui`                         | F1                          |
| F3  | Formulaire tâche + sous-tâches + menu "changer de statut"                                | `components/tasks`                      | B1, B3 (ou mock du contrat) |
| F4  | Kanban (dnd-kit), cartes, étoile, compteurs                                              | `KanbanBoard`, `TaskCard`               | B4, F3                      |
| F5  | Écran Rappels : liste, formulaire, bandeau permission, bandeau "manqué"                  | `components/reminders`, `app/reminders` | B6, B7, B11                 |
| F6  | Gantt (lecture seule, navigation de fenêtre, jour courant)                               | `GanttChart`                            | B4                          |
| F7  | Calendrier mensuel (tâches + rappels, "+ n autres")                                      | `CalendarMonth`                         | B11                         |
| F8  | Panneau plan du jour + formulaire créneau                                                | `components/plan-day`                   | B9, B11                     |
| F9  | Dashboard : anneaux SVG, histogramme SVG, profil                                         | `components/dashboard`                  | B10                         |
| F10 | États vides, erreurs, responsive de base, finitions                                      | transverse                              | tout                        |

Les écrans peuvent démarrer sur des données mockées respectant les interfaces de la section 7 ; l'intégration consiste à remplacer le mock par les hooks réels (même signature).

## 9. Ordre de réalisation

| Étape | Contenu                                                               | Pourquoi dans cet ordre                                                                                         |
| ----- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 0     | Init du dépôt (devops), tokens et écrans (designer)                   | Débloque tout le monde                                                                                          |
| 1     | **B1 (contrat)** en premier, en une demi-journée, puis B2             | Le frontend n'attend ensuite plus le backend                                                                    |
| 2     | Parallèle : B3, B4 / F1, F2, F3, F4                                   | Tâches + Kanban = cœur visible de la maquette                                                                   |
| 3     | Parallèle : B5, B6, B7, B8 / F5                                       | Rappels et notifications = cœur du produit et principal risque technique ; **spike throttling d'onglet dès B7** |
| 4     | Parallèle : B9, B10, B11 / F6, F7, F8, F9                             | Vues dérivées, aucune ne bloque les autres                                                                      |
| 5     | F10, B12 (Should), recette (qa), déploiement Vercel statique (devops) | Finitions et mise en ligne                                                                                      |

Jalon "démo" : fin d'étape 2 (créer des tâches, les déplacer dans le Kanban, persistées). Jalon "Reminder utile" : fin d'étape 3.

## 10. Contraintes de gratuité

- Hébergement : Vercel Hobby, site statique, aucun service payant (ET-5). Aucune fonction serverless, aucun cron, aucune variable secrète, aucune base distante.
- Usage Hobby de Vercel : non commercial, compatible avec un usage personnel.
- Aucune API tierce, aucune police ou icône à licence payante (polices Google Fonts ou `next/font` selon le designer).
- Limite de stockage : quota IndexedDB du navigateur, large pour du texte ; seule une éventuelle pièce jointe volumineuse poserait question (AMB-08).

## 11. Ambiguïtés du SPEC ayant un impact architectural

Colonne 2 : hypothèse de travail du SPEC retenue dans cette architecture. Colonne 3 : ce qui change si le client tranche autrement.

| AMB                                       | Hypothèse retenue                                                                                                                                                               | Si le client tranche autrement                                                                                                                                                                                                                                                                                                                                                                            |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AMB-01 Lien rappel/tâche                  | **TRANCHÉ : oui, optionnel** (`Reminder.taskId?`, voir section 0)                                                                                                               | Sans objet.                                                                                                                                                                                                                                                                                                                                                                                               |
| AMB-02 Notifs onglet fermé                | **TRANCHÉ : application ouverte suffisante, pas de push**                                                                                                                       | Sans objet (Web Push écarté).                                                                                                                                                                                                                                                                                                                                                                             |
| AMB-03 Rappel passé app fermée            | **TRANCHÉ : "manqué" affiché à la réouverture**                                                                                                                                 | Réglage fin restant : seuil `LATE_GRACE_MS` (5 min) et règle "seule l'occurrence la plus récente est journalisée" (hypothèse d'architecte, une constante).                                                                                                                                                                                                                                                |
| AMB-04 Date passée à la création          | Refusée                                                                                                                                                                         | Simple retrait de la règle dans `schemas.ts` ; un rappel passé est alors traité comme "manqué" ou déclenché immédiatement (à préciser).                                                                                                                                                                                                                                                                   |
| AMB-05 Récurrence                         | Série entière, sans fin, 1 jour/semaine, dernier jour du mois                                                                                                                   | Date de fin : ajouter `endDate?` sur `Reminder` et le prendre en compte dans `recurrence.ts`. Plusieurs jours par semaine : remplacer l'ancre par `weekdays: number[]`. Modifier/supprimer une occurrence seule : nouvelle table `reminderExceptions {reminderId, originalDueAt, cancelled \| override}` consultée par `recurrence.ts` et le calendrier. Moyen impact, localisé dans `domain/` + `data/`. |
| AMB-06 Dates des tâches                   | **TRANCHÉ : obligatoires** (section 0)                                                                                                                                          | Sans objet.                                                                                                                                                                                                                                                                                                                                                                                               |
| AMB-07 Statut / progression / sous-tâches | Progression manuelle, Terminé force 100 %                                                                                                                                       | Progression calculée depuis les sous-tâches : `progress` devient dérivé (fonction dans `task-rules.ts`) pour les tâches ayant des sous-tâches, champ de saisie masqué. Règles supplémentaires (retour de Terminé, etc.) : toutes dans `task-rules.ts`, un seul fichier.                                                                                                                                   |
| AMB-08 Commentaires / pièces jointes      | Commentaires texte oui ; pièces jointes en attente                                                                                                                              | Pièces jointes validées : table `attachments` avec `Blob` dans IndexedDB (limite de taille à fixer, quota navigateur ; export JSON plus lourd). Si elles exigent un accès multi-appareil, il faut un stockage objet distant (Vercel Blob gratuit très limité) et sort du "zéro serveur". Si refusées : supprimer le compteur ou l'afficher à 0 de façon fixe.                                             |
| AMB-09 "En édition" / transitions         | Transitions libres                                                                                                                                                              | Transitions contraintes : fonction `canTransition(from, to)` dans `task-rules.ts`, appelée par `move()` ; le Kanban grise les colonnes interdites.                                                                                                                                                                                                                                                        |
| AMB-10 Favori filtre / recherche          | Hors MVP                                                                                                                                                                        | Filtre côté client sur le tableau déjà chargé (volume personnel faible), aucun changement de stockage ; un champ de recherche dans `TaskBoard`.                                                                                                                                                                                                                                                           |
| AMB-11 Sous-tâches                        | 1 niveau, case à cocher                                                                                                                                                         | Sous-tâches avec statut/dates/assigné : soit étendre `Subtask`, soit (recommandé) les migrer vers `Task` avec `parentId` pour réutiliser Kanban et Gantt. Migration Dexie nécessaire ; impact moyen sur `TaskService` et `TaskCard`.                                                                                                                                                                      |
| AMB-12 Ordre des cartes                   | Conservé (Should)                                                                                                                                                               | Le champ `position` est **déjà prévu** dès la v1 (coût nul) ; si non voulu, le tri se fait par `updatedAt`.                                                                                                                                                                                                                                                                                               |
| AMB-13 Plan du jour                       | Créneaux libres ou liés, jour courant, chevauchement avec avertissement                                                                                                         | Autres jours : `date` existe déjà, ajout d'un sélecteur de jour (UI seule). Récurrence de créneaux : ajouter `recurrence` sur `PlanSlot`, réutiliser `recurrence.ts`. Chevauchement interdit : l'avertissement devient une erreur de validation.                                                                                                                                                          |
| AMB-14 Gantt                              | Lecture seule                                                                                                                                                                   | Gantt interactif (glisser pour dates/progression) : composant à enrichir avec des gestes pointeur ; `TaskService.update` suffit côté données. Évaluer alors une lib dédiée ; surcoût frontend significatif.                                                                                                                                                                                               |
| AMB-15 Calendrier                         | Mois, tâches + rappels                                                                                                                                                          | Vue semaine/jour : nouveaux composants, mêmes hooks (`useCalendarEntries` prend une plage). Si rappels exclus : retirer `occurrencesBetween` du calendrier.                                                                                                                                                                                                                                               |
| AMB-16 Navigation                         | Écran Rappels dédié ; Analytics fusionné au Dashboard                                                                                                                           | Routing seulement (dossiers `app/`) ; aucun impact données.                                                                                                                                                                                                                                                                                                                                               |
| AMB-17 Exclusions / langue                | Exclues, interface en français                                                                                                                                                  | Aucune lib d'i18n ; chaînes dans `lib/constants` + composants. Si multi-langue : introduire `next-intl` (avec l'export statique, routes par locale) ; coût moyen, à planifier hors MVP.                                                                                                                                                                                                                   |
| AMB-18 Efficacité / histogramme           | **Anneaux TRANCHÉS : progression par tâche/projet** (un anneau par tâche). Histogramme encore ouvert : hypothèse = tâches terminées par jour sur 7 jours, d'après `completedAt` | Anneaux : sans objet. Histogramme : seule `completedPerDay` change (autre période = paramètre `days`). `completedAt` est stocké dès la v1 pour ne pas perdre d'historique.                                                                                                                                                                                                                                |
| AMB-19 Profil                             | Nom éditable, avatar par défaut                                                                                                                                                 | Si avatar téléversable : ajouter un `Blob` dans `settings`. Si non éditable : constante. Impact minimal.                                                                                                                                                                                                                                                                                                  |
| AMB-20 Mobile, multi-appareil, export     | Bureau, un appareil, pas d'export                                                                                                                                               | Mobile : Tailwind responsive + PWA, sans changement d'architecture (limites iOS en section 6). **Multi-appareil : impose un serveur et une base distante avec synchronisation** (Turso/Neon/Supabase gratuits, secret d'accès unique), donc un changement de stockage majeur ; la couche `data/services` isolée le permet. Export JSON : B12, faible coût, recommandé quelle que soit la réponse.         |

## 12. Risques et points à surveiller

1. **Notifications** : précision à 60 s sous throttling d'onglet caché (spike en étape 3) ; limite onglet fermé à bien expliquer au client avant livraison.
2. **Perte de données locale** (Safari 7 jours, effacement du navigateur) : `persist()`, PWA, et export JSON recommandé.
3. **Hydratation Next/IndexedDB** : toutes les pages de données sont des composants clients rendant un squelette tant que les hooks renvoient `undefined`, pour éviter les écarts de rendu serveur/client.
4. **Cohérence de la maquette** : A/B/C/D (auteurs) n'ont pas d'équivalent pour un utilisateur unique ; le designer les remplace par les tâches (anneaux = une tâche chacun, AMB-18) et par des pastilles de tâche pour le plan du jour (AMB-13).
