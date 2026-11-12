# DESIGN : Reminder (MVP)

Sources : docs/BRIEF.md, docs/SPEC.md, docs/ARCHITECTURE.md, docs/reference/1.png. Rédigé par le designer. Aucun code ici : parcours, écrans, composants (props alignées sur `domain/types.ts` et la section 7 de ARCHITECTURE.md), tokens exprimés pour Tailwind, états, accessibilité, responsive.

Interface 100 % en français. Heures au format 24 h (`14:00`), dates courtes (`11 nov.`, `mer. 11 nov.`), semaine commençant le lundi.

---

## 0. Décisions de design (à connaître avant de lire le reste)

| Sujet | Décision |
|---|---|
| Fidélité à la maquette | Sidebar à gauche (icône + libellé en capitales), titre de page + fil d'Ariane, grand panneau bleu clair central contenant Gantt puis Kanban, panneau droit (profil, plan, efficacité, histogramme). Cartes blanches très arrondies, ombre douce, pastel + couleurs vives. |
| Éléments de la maquette retirés | Menu d'en-tête Pricing / About / Language / Conditions, entrées Message / Global / Finance, sous-titre "01 Division / 01 Department / A Team", auteurs A/B/C/D (AMB-17, AMB-18). |
| Remplaçants | En-tête : fil d'Ariane + pastille d'état des notifications. Sous-titre de page : date du jour. Pastilles A/B/C/D : **initiale du titre de la tâche** sur fond de la couleur de la tâche. |
| Navigation | 4 entrées : Tableau de bord, Tâches, Planning, Rappels. "Analytics" fusionné dans Tableau de bord (AMB-16). |
| Couleur d'une tâche | Une tâche reçoit une des 4 couleurs d'accent (bleu, violet, rose, ambre) de façon **stable** : `index = hash(task.id) mod 4`, helper `taskAccent(id)` dans `lib/`. Même couleur partout : barre Gantt, anneau, pastille, liseré de sous-tâche, créneau lié. |
| Compteur à zéro (CA-T6.2) | Toujours affiché (`0`) en gris atténué, jamais masqué. Identique partout. |
| Pièces jointes (AMB-08) | Le compteur trombone n'est rendu **que si** la fonctionnalité est validée. Sinon il est absent (pas de faux `0`). Le composant `TaskCard` reçoit `attachmentCount` et un drapeau `showAttachments`. |
| Plafond des anneaux | `limit = 4` dans le panneau droit, `limit = 8` sur la page Tableau de bord (section 6.1). |
| Histogramme | Tâches terminées par jour sur 7 jours glissants, aujourd'hui à droite (section 6.2). |
| Panneau droit | Visible sur Tâches, Planning, Rappels. Sur Tableau de bord, il ne contient que Profil + Plan du jour (anneaux et histogramme sont déjà en grand au centre). |

---

## 1. Parcours utilisateur

### 1.1 Première ouverture (aucune donnée)
1. Arrivée sur **Tableau de bord** : états vides guidés. Carte d'accueil "Bienvenue" avec 2 actions : **Créer ma première tâche** et **Créer un rappel**.
2. Anneaux et histogramme en état vide (section 8). Plan du jour vide avec "Ajouter un créneau".
3. Le bandeau de permission de notification n'est **pas** affiché au chargement : il apparaît dans l'écran Rappels et dans le formulaire de rappel (CA-R5.1, demande sur action explicite).

### 1.2 Créer et suivre une tâche
1. Bouton **+ Nouvelle tâche** (en-tête de page, ou **+ Ajouter** en pied de colonne Kanban qui préremplit le statut).
2. `TaskForm` en modale : titre, début, fin (obligatoires), statut, progression, favori. Validation par champ à la soumission.
3. Retour sur la page : la carte apparaît dans la bonne colonne, la barre dans le Gantt, l'anneau dans l'efficacité, sans rechargement (ET-2). Un toast confirme "Tâche créée".
4. Avancer : glisser la carte vers une autre colonne, **ou** menu `⋮` > "Changer de statut" (clavier, tactile). Passer à Terminé fixe la progression à 100 % et fait monter l'histogramme.
5. Ouvrir la carte (clic sur le titre) : même `TaskForm` en mode édition, avec sous-tâches, commentaires, rappels liés.

### 1.3 Créer un rappel et recevoir la notification
1. Écran **Rappels** > **+ Nouveau rappel** (ou depuis la fiche d'une tâche : "Ajouter un rappel", tâche préliée).
2. `ReminderForm` : titre, date, heure, récurrence, tâche liée (optionnelle), note.
3. Si la permission est `default` : après l'enregistrement, la carte `NotificationBanner` explique le besoin et propose **Activer les notifications** (clic = `requestPermission()`).
4. À l'heure dite, application ouverte : notification système. Si permission refusée : toast dans l'application + entrée dans la liste (repli, CA-R5.3).
5. Si l'application était fermée : à la réouverture, `MissedBanner` liste les occurrences manquées (échues depuis plus de 5 min) ; l'utilisateur les ferme une à une ou toutes.

### 1.4 Planifier sa journée
1. Panneau droit > **Plan** > **+ Créneau** : `SlotForm` (titre ou tâche liée, début, fin).
2. Les créneaux apparaissent triés, au format `12:00 - 13:00`. Chevauchement : créneau enregistré avec un avertissement visible (AMB-13).
3. Vue d'ensemble de la semaine/du mois : **Planning** > onglet Calendrier ; vue durée/avancement : onglet Gantt.

### 1.5 Revue d'avancement
Tableau de bord : anneaux (progression par tâche), histogramme (terminées par jour sur 7 jours), prochains rappels. Clic sur un anneau : ouvre la tâche.

### 1.6 Suppression
Toujours une `ConfirmDialog` : tâche (mentionne sous-tâches supprimées et rappels conservés mais déliés), rappel (mentionne la série entière si récurrent), créneau (sans confirmation lourde : bouton annuler dans un toast, Should).

---

## 2. Gabarit global (coquille)

```
┌─────────┬──────────────────────────────────────────────┬───────────────┐
│ Sidebar │ En-tête : ☰  Fil d'Ariane            🔔 état │               │
│ 240 px  ├──────────────────────────────────────────────┤  Panneau droit│
│         │ Titre de page (gras 32)    [+ Nouvelle tâche]│  320 px       │
│ Tableau │ Sous-titre : date du jour                    │  Profil       │
│ Tâches  │ ┌────────── panneau "scène" bleu clair ─────┐│  Plan         │
│ Planning│ │  contenu de la page                       ││  Efficacité   │
│ Rappels │ └───────────────────────────────────────────┘│  Histogramme  │
└─────────┴──────────────────────────────────────────────┴───────────────┘
```

- **Sidebar** : icônes ligne (lucide) + libellé en capitales, graisse 600, `tracking-wider`, taille 11-12 px comme la maquette. Entrée active : icône et texte `blue-600`, pastille de fond `blue-50` arrondie. Le hamburger de l'en-tête réduit la sidebar en icônes seules (72 px).
- **En-tête** : fil d'Ariane (`Tâches > Aujourd'hui`), et à droite la **pastille d'état des notifications** (remplace Pricing/About/Language/Conditions) : point vert "Notifications actives", point ambre "Notifications désactivées" ; clic = va à `/reminders`.
- **Titre de page** : Montserrat 800, `text-3xl`, couleur `ink`. Sous-titre : "mercredi 11 novembre" en `muted`.
- **Scène** : conteneur `bg-stage rounded-[32px] p-6` qui regroupe le contenu principal, comme le grand panneau bleu clair de la maquette. Les cartes y flottent en blanc.
- **Panneau droit** : colonne fixe sur le canevas (pas dans une carte), sections séparées par un titre gras 14 px (`Plan`, `Efficacité`, `Tâches terminées`), comme la maquette.

Bandeaux transverses (au-dessus du titre, pleine largeur du contenu) : `MissedBanner` (si occurrences manquées non acquittées), `NotificationBanner` (selon permission, voir section 7).

---

## 3. Écrans

### 3.1 Tableau de bord (`/`)
Objectif : coup d'œil sur l'avancement.

- Titre "Tableau de bord", sous-titre date. Actions : **+ Nouvelle tâche**, **+ Nouveau rappel**.
- Dans la scène :
  1. **Carte Efficacité** (pleine largeur) : `EfficiencyRings size="lg" limit={8}`, grille 4 colonnes x 2 lignes, anneau 96 px, pourcentage au centre, titre de la tâche dessous (tronqué à 2 lignes, titre complet en infobulle/`aria-label`). Lien "Voir toutes les tâches (n)" si n > 8.
  2. **Carte Tâches terminées** (2/3 de largeur) : `CompletedHistogram size="lg"`.
  3. **Carte Prochains rappels** (1/3) : 3 prochains rappels (Should), lien "Tous les rappels".
- Panneau droit en variante réduite : Profil + Plan du jour.
- États : section 8.

### 3.2 Tâches / Kanban (`/tasks`) : l'écran de la maquette
Fil d'Ariane `Tâches > Aujourd'hui`. Titre "Gestion des tâches".

Dans la scène, de haut en bas :
1. **Gantt compact** (`GanttChart variant="compact"`) : 9 jours visibles (comme 28 → 06 dans la maquette), 4 lignes visibles maximum puis défilement vertical interne ; lien "Ouvrir le planning" vers `/planning`.
2. **Quatre colonnes Kanban** : `BROUILLON`, `EN COURS`, `EN ÉDITION`, `TERMINÉ` (capitales, `tracking-[0.2em]`, 12 px, graisse 700, centrées, avec compteur `(3)` en gris). Largeur égale (`grid-cols-4 gap-6`). Défilement vertical par colonne si besoin.
3. **Carte de tâche** (`TaskCard`) : voir 4.4. Pied de colonne : bouton fantôme **+ Ajouter une tâche**.

Interactions : glisser-déposer (dnd-kit) entre colonnes et dans une colonne (réordonnancement, AMB-12) ; menu `⋮` > Changer de statut / Modifier / Supprimer ; clic étoile = favori sans ouvrir la carte (CA-T5.2) ; clic sur le titre = ouvre `TaskForm`.

Retour visuel de glissement : carte source à `opacity-40`, aperçu flottant (`DragOverlay`) `scale-[1.02] -rotate-1 shadow-card-lg`, colonne cible `ring-2 ring-blue-300 bg-blue-50/60`, repère d'insertion = trait `h-1 rounded-full bg-blue-600` entre cartes. Lâcher hors colonne : retour animé à la place d'origine (CA-K2.3).

### 3.3 Planning (`/planning`)
Titre "Planning". Onglets segmentés (pilule) : **Gantt** | **Calendrier** (état mémorisé dans l'URL `?vue=gantt|calendrier`).

**Onglet Gantt** (`GanttChart variant="full"`)
- Barre d'outils : `‹` Précédent, **Aujourd'hui**, `›` Suivant (décalage de 7 jours), plage affichée "28 oct. - 10 nov.".
- Fenêtre par défaut : 14 jours, aujourd'hui à la 3e colonne environ. Largeur d'un jour : 56 px, défilement horizontal si la fenêtre est plus large que l'écran.
- En-tête : numéros de jour (`28 29 30 31 01 02`) en gras 12 px, le jour 01 porte le mois en dessous (`déc.`), week-ends en `text-slate-500`. Lignes verticales fines `border-line` entre jours (comme la maquette). Jour courant : colonne teintée `bg-blue-600/5` + trait `blue-600` + pastille "Aujourd'hui" (CA-P1.6).
- Colonne gauche (sticky, 260 px) : **cartes-étiquettes** blanches, `rounded-full`, ombre douce : pastille initiale colorée, titre (1 ligne tronquée, 12 px gras), sous-ligne dates `28 oct. → 02 nov.`, menu `⋮` (Modifier, Changer de statut).
- **Barre** (`rounded-full`, hauteur 56 px) : piste pastel de la couleur de la tâche sur toute la durée (début → fin inclus), partie foncée proportionnelle à `progress`, pourcentage en gras blanc (ou texte brun foncé sur ambre) à l'extrémité droite de la partie foncée. À 0 % : pas de partie foncée, pourcentage `0 %` sur la piste en `ink`. Un petit interrupteur décoratif à gauche de la barre dans la maquette est **supprimé** (sans fonction, AMB-14 lecture seule).
- Tâche d'un jour : barre minimale d'un jour (56 px), `%` masqué si trop étroit, valeur dans l'infobulle.
- Tâche dépassant la fenêtre : extrémité tronquée avec chevron `‹`/`›`.
- Lecture seule : clic sur la barre ou l'étiquette = ouvre `TaskForm` (CA-P1 / AMB-14).
- Vide : section 8.

**Onglet Calendrier** (`CalendarMonth`)
- Barre d'outils : `‹` mois précédent, **Aujourd'hui**, `›` suivant, titre "novembre 2026".
- Grille 7 colonnes (lun → dim), 5 ou 6 lignes, cellules blanches `rounded-2xl` séparées par un espace de 8 px (style cartes de la maquette). Jours hors mois en `text-slate-500` sur fond `white/50`. Aujourd'hui : numéro dans un cercle `blue-600` blanc.
- Dans une cellule (`DayCell`) : jusqu'à 3 éléments puis `+ n autres` (ouvre une popover listant tout, CA/CL P2).
  - Tâche : pastille pleine pastel de la couleur de la tâche, texte `ink` 11 px tronqué ; sur une période multi-jours, les extrémités sont arrondies au premier et au dernier jour, plates entre.
  - Rappel : icône cloche + heure + titre, liseré gauche `blue-600`, y compris occurrences récurrentes futures (CA-P2.3).
- Clic sur un élément = ouvre sa fiche (`TaskForm` / `ReminderForm`). Clic sur le numéro du jour = popover "Détail du jour" avec les éléments + boutons "Nouvelle tâche à cette date" / "Nouveau rappel ce jour".
- Mois à 28/29/30/31 jours et changement d'année : gérés par la grille, aucune cellule vide manquante.

**Panneau droit sur Planning** : **Plan du jour** en tête (voir 3.3.1), puis Efficacité et Histogramme comme ailleurs.

#### 3.3.1 Plan du jour (`PlanDayPanel`, dans le panneau droit)
- Titre `Plan` + date ("Aujourd'hui, mer. 11 nov."). Chevrons `‹ ›` pour changer de jour (Should, AMB-13 : l'UI seule, la donnée porte déjà `date`).
- Liste de créneaux triés par `start`. Chaque créneau (carte `rounded-2xl`, fond `white`, ombre douce) :
  - Gauche : pastille de la tâche liée (initiale colorée) ou icône horloge grise si créneau libre.
  - Centre : **`12:00 - 13:00`** en gras 14 px, titre dessous en 12 px `muted`.
  - Droite : liseré vertical 4 px de la couleur de la tâche (cyan par défaut pour un créneau libre), comme les barres turquoise/bleu de la maquette.
  - Chevauchement : icône avertissement ambre + texte "Chevauche 13:00 - 14:00" (ne bloque pas).
  - Survol/focus : boutons Modifier et Supprimer.
- Pied : bouton **+ Créneau** ouvre `SlotForm` (popover ou modale).
- Vide : "Rien de prévu aujourd'hui" + bouton.

### 3.4 Rappels (`/reminders`)
Titre "Rappels". Action : **+ Nouveau rappel**.

De haut en bas :
1. `MissedBanner` (si besoin).
2. `NotificationBanner` (selon permission). Texte permanent obligatoire en `granted` (CA-R5.5) : "Les notifications ne sont envoyées que lorsque Reminder est ouvert dans un onglet du navigateur."
3. Scène avec deux sections :
   - **À venir** : `ReminderList` triée par date croissante.
   - **Passés et manqués** : rappels déclenchés (pastille verte "Déclenché à 09:00") et manqués (pastille ambre "Manqué"). Les rappels non récurrents déjà passés restent consultables et supprimables.
4. **Élément de liste** (carte blanche `rounded-3xl`) : bloc date à gauche (jour en gros, mois en capitales, ex. `14` / `NOV.`), puis titre (gras), heure et note (2 lignes max), puces : récurrence (`Chaque semaine`), tâche liée (`Tâche : Refonte du site`, lien), boutons Modifier / Supprimer (icônes avec libellé accessible).
5. Vide : section 8.

### 3.5 Formulaire de création/édition d'une tâche (`TaskForm`)
Modale centrée (`max-w-xl`, `rounded-[28px]`), titre "Nouvelle tâche" / "Modifier la tâche". En mobile : feuille plein écran.

Champs, dans l'ordre :
1. **Titre** (obligatoire, 200 car. max, compteur à partir de 180). Erreur : "Le titre est obligatoire." / "Le titre ne peut pas dépasser 200 caractères."
2. **Début** et **Fin** côte à côte (`input type="date"`, obligatoires, `min` de Fin = Début). Erreurs : "La date de début est obligatoire." / "La date de fin est obligatoire." / "La date de fin ne peut pas précéder la date de début."
3. **Statut** : contrôle segmenté à 4 options colorées (Brouillon, En cours, En édition, Terminé), défaut Brouillon.
4. **Progression** : curseur 0-100 + champ numérique synchronisé + aperçu `ProgressBar`. Si statut = Terminé : champ verrouillé à 100 avec aide "Une tâche terminée est à 100 %." Erreur : "La progression doit être un entier entre 0 et 100."
5. **Favori** : `StarButton` avec libellé "Marquer comme favori".
6. En mode édition uniquement, sections repliables :
   - **Sous-tâches** (`SubtaskList`) : ratio `2/5`, cases à cocher, renommer en ligne, supprimer, champ "Ajouter une sous-tâche" (Entrée valide). Erreur : "La sous-tâche ne peut pas être vide."
   - **Commentaires** : liste + champ "Ajouter un commentaire" (AMB-08, texte seulement). Erreur : "Le commentaire ne peut pas être vide."
   - **Rappels liés** : liste des rappels de la tâche (`remindersOf`), bouton "Ajouter un rappel" (ouvre `ReminderForm` avec `taskId` prérempli).
   - **Pièces jointes** : uniquement si AMB-08 les valide.
7. Pied : **Enregistrer** (primaire), **Annuler**, et en édition **Supprimer** (danger, à gauche) qui ouvre la confirmation.

Comportements : focus initial sur Titre ; Entrée dans le titre soumet ; Échap ferme (confirmation si modifications non enregistrées, Should) ; erreurs affichées sous chaque champ, focus sur le premier champ en erreur, résumé annoncé via `aria-live`.

Confirmation de suppression : titre "Supprimer cette tâche ?". Texte : "Les {n} sous-tâches seront supprimées avec elle. Les {m} rappels liés sont conservés mais ne seront plus rattachés à une tâche. Cette action est irréversible." Boutons : Annuler, **Supprimer** (danger).

### 3.6 Formulaire de création/édition d'un rappel (`ReminderForm`)
Modale `max-w-lg`. Titre "Nouveau rappel" / "Modifier le rappel".

1. **Titre** (obligatoire, 200 car.). Erreur : "Le titre est obligatoire."
2. **Date** et **Heure** côte à côte (obligatoires). Erreurs : "La date est obligatoire.", "L'heure est obligatoire.", "Ce rappel est dans le passé. Choisissez une date et une heure à venir." (AMB-04).
3. **Répétition** : contrôle segmenté `Aucune` | `Chaque jour` | `Chaque semaine` | `Chaque mois`. Aide dynamique sous le contrôle : "Chaque mercredi à 14:00" ; pour le mensuel : "Le 31 de chaque mois (le dernier jour des mois plus courts)".
4. **Tâche liée** (optionnel) : liste déroulante "Aucune tâche" + tâches existantes. Erreur si la tâche n'existe plus : "Cette tâche n'existe plus."
5. **Note** : zone de texte 3 lignes, facultative.
6. Pied : **Enregistrer**, **Annuler**, et en édition **Supprimer**.

Édition d'un rappel récurrent : message informatif en haut de la modale "Les changements s'appliquent à toute la série." (AMB-05). Suppression : "Supprimer ce rappel ? S'il est récurrent, toute la série sera supprimée."

### 3.7 Formulaire de créneau (`SlotForm`)
Popover/modale compacte : **Titre** (ou choix d'une tâche qui préremplit le titre), **Début**, **Fin** (`input type="time"`), **Tâche liée** facultative. Erreurs : "Le titre est obligatoire.", "L'heure de fin doit être postérieure à l'heure de début." Un créneau qui traverse minuit est refusé avec ce même message.

---

## 4. Composants réutilisables

Les props reprennent les types de `domain/types.ts` (ARCHITECTURE.md section 5 et 7). Les composants n'importent que `data/hooks`, `data/services`, `domain/types` (règle de dépendance, section 3 de l'architecture). Les composants "présentationnels" listés reçoivent leurs données en props, la page (conteneur) appelle les hooks.

Convention : toute fonction d'envoi de formulaire renvoie un `Result<T, Input>` ; le formulaire affiche `errors[champ]` sous le champ correspondant (ET-6).

### 4.1 `components/ui`

| Composant | Props | Notes |
|---|---|---|
| `Button` | `variant: 'primary'\|'secondary'\|'ghost'\|'danger'`, `size: 'sm'\|'md'\|'lg'`, `loading?`, `leftIcon?`, `disabled?`, `type` | Pilule `rounded-full`. Primaire `bg-blue-600 text-white`. Hauteur min 44 px (`md`). |
| `IconButton` | `label: string` (obligatoire, devient `aria-label`), `icon`, `variant`, `onClick` | 40 px, zone tactile 44 px. |
| `Modal` | `open`, `title`, `onClose`, `size: 'md'\|'lg'`, `children`, `footer?` | `role="dialog"` `aria-modal`, piège de focus, Échap, retour du focus à l'élément déclencheur. |
| `ConfirmDialog` | `open`, `title`, `description: ReactNode`, `confirmLabel`, `tone: 'danger'\|'neutral'`, `onConfirm`, `onCancel` | `role="alertdialog"`, focus initial sur **Annuler**. |
| `Field` | `label`, `htmlFor`, `error?: string`, `hint?`, `required?`, `children` | Erreur liée par `aria-describedby`, `aria-invalid` sur le contrôle. Étoile rouge + mention "(obligatoire)" lisible. |
| `ProgressBar` | `value: number` (0-100), `accent?: 'gradient'\|AccentName`, `showLabel?`, `size` | `role="progressbar"` + `aria-valuenow`. Par défaut dégradé bleu → violet (carte Kanban). |
| `EmptyState` | `icon`, `title`, `description?`, `action?: { label, onClick }`, `tone?: 'default'\|'subtle'` | Centré, utilisé pour chaque liste/vue (ET-6). |
| `Avatar` | `label: string` (titre dont on prend l'initiale), `accent: AccentName`, `size: 'sm'\|'md'\|'lg'` | Disque pastille avec initiale (remplace A/B/C/D). `aria-hidden` si le titre est déjà lu à côté. |
| `StarButton` | `active: boolean`, `onToggle()`, `label` | Étoile jaune pleine si actif, contour gris sinon. `aria-pressed`. `stopPropagation` (CA-T5.2). |
| `Counter` | `icon: 'comment'\|'attachment'`, `count: number` | Icône 16 px + nombre ; `0` en `text-slate-500`. Libellé SR : "3 commentaires". |
| `Toast` / `ToastRegion` | `tone: 'success'\|'error'\|'info'`, `message`, `action?` | `role="status"` (`alert` pour erreur), 5 s, pause au survol/focus. Sert aussi de repli "Rappel : {titre}" si la permission est refusée. |
| `Skeleton` | `variant: 'card'\|'row'\|'ring'\|'bar'` | Affiché tant qu'un hook renvoie `undefined`. |
| `Segmented` | `options: {value,label,accent?}[]`, `value`, `onChange`, `ariaLabel` | Groupe radio stylé (statut, répétition, onglets Gantt/Calendrier). |

### 4.2 `components/layout`

| Composant | Props | Notes |
|---|---|---|
| `Sidebar` | `activeHref: string`, `collapsed: boolean`, `onToggle()` | Items fixes : `/` Tableau de bord, `/tasks` Tâches, `/planning` Planning, `/reminders` Rappels. `<nav aria-label="Navigation principale">`, `aria-current="page"`. |
| `Breadcrumb` | `items: { label: string; href?: string }[]` | Dernier item `aria-current="page"`. Séparateur `>`. |
| `PageHeader` | `title`, `subtitle?`, `actions?: ReactNode` | Titre en `h1` unique par page. |
| `NotificationStatusChip` | `permission: PermissionState` | Pastille d'en-tête. Texte + point coloré (jamais couleur seule). |
| `RightPanel` | `variant: 'full'\|'compact'`, `profile: Profile \| undefined`, `date: LocalDate` | `compact` = Profil + Plan seulement. Compose `ProfileCard`, `PlanDayPanel`, `EfficiencyRings` (`limit=4`), `CompletedHistogram` (`days=7`). |

### 4.3 `components/dashboard`

| Composant | Props | Notes |
|---|---|---|
| `ProfileCard` | `profile: Profile`, `onRename(displayName: string)` | Avatar par défaut (logo en losanges bleu/rose comme la maquette), nom centré en gras 20 px (2 lignes), crayon pour renommer (AMB-19). |
| `EfficiencyRings` | `rings: RingMetric[]`, `size: 'sm'\|'lg'`, `limit: number`, `totalTasks?: number`, `onSelect(taskId: ID)` | Voir 6.1. |
| `CompletedHistogram` | `data: BarDatum[]`, `size: 'sm'\|'lg'`, `today: LocalDate` | Voir 6.2. |

### 4.4 `components/tasks`

| Composant | Props | Notes |
|---|---|---|
| `TaskCard` | `task: TaskCardData`, `showAttachments: boolean`, `onOpen(id)`, `onToggleStar(id)`, `onToggleSubtask(subtaskId)`, `onMove(id, status: TaskStatus)`, `onDelete(id)`, `isDragging?`, `dragHandleProps?` | Contenu en 4.4.1. |
| `StatusMenu` | `current: TaskStatus`, `onChange(status: TaskStatus)`, `triggerLabel?` | Menu `⋮` (`aria-haspopup="menu"`) : "Changer de statut" (4 entrées, la courante cochée), "Modifier", "Supprimer". Alternative non-DnD (CA-K2.4). |
| `KanbanBoard` | `board: TaskBoard`, `showAttachments`, `onMove(id, status, beforeId?)`, `onCreateIn(status)`, `onOpen(id)`, `onToggleStar`, `onToggleSubtask`, `onDelete` | `DndContext` (`PointerSensor` avec seuil 6 px, `KeyboardSensor`, `TouchSensor` avec délai 200 ms). Annonces FR (section 9). |
| `KanbanColumn` | `status: TaskStatus`, `tasks: TaskCardData[]`, `isOver?`, `onCreate()` | En-tête capitales + compteur ; zone droppable ; état vide intégré. |
| `TaskForm` | `mode: 'create'\|'edit'`, `initial?: TaskCardData`, `defaultStatus?: TaskStatus`, `onSubmit(input: TaskInput): Promise<Result<Task, TaskInput>>`, `onDelete?(id)`, `onClose()` | Décrit en 3.5. |
| `SubtaskList` | `taskId: ID`, `subtasks: Subtask[]`, `onAdd(title)`, `onRename(id, title)`, `onToggle(id)`, `onRemove(id)` | Les `on*` renvoient `Result<Subtask, { title: string }>` pour add/rename ; erreur affichée sous le champ. |

**4.4.1 Anatomie de `TaskCard`** (carte blanche `rounded-3xl p-5 shadow-card`)
1. Ligne titre : titre en gras 16 px (2 lignes max, `line-clamp-2`, titre complet en `title`/`aria-label`) + `StatusMenu` (⋮).
2. Dates : puce `28 oct. → 02 nov.` 11 px `muted`.
3. Sous-tâches : jusqu'à 3 lignes "pilule" (`rounded-2xl bg-blue-50/70`, liseré gauche 4 px de la couleur de la tâche, pastille initiale ou case ronde, texte 12 px tronqué ; faite = coche verte `green-600` + texte barré léger). Ratio `2/5` à droite du titre de section. Au-delà de 3 : `+ n autres` (ouvre la fiche). Pas de sous-tâche : bloc absent.
4. Ligne méta : `Counter` commentaires, `Counter` pièces jointes (si `showAttachments`), et à droite `StarButton`.
5. `ProgressBar` dégradé bleu→violet avec libellé "Progression 75 %" au-dessus (comme la maquette). Carte Terminé : barre pleine `green-600`, coche.

### 4.5 `components/planning` et `plan-day`

| Composant | Props | Notes |
|---|---|---|
| `GanttChart` | `tasks: Task[]`, `windowStart: LocalDate`, `days: number`, `today: LocalDate`, `variant: 'compact'\|'full'`, `onWindowChange(start: LocalDate)`, `onOpenTask(id)` | Lecture seule (AMB-14). Maison, CSS grid. `compact` : `days=9`, 4 lignes visibles. `full` : `days=14`, 56 px/jour. |
| `CalendarMonth` | `monthStart: LocalDate`, `entries: { tasks: Task[]; reminders: ReminderOccurrence[] }`, `today: LocalDate`, `onMonthChange(monthStart)`, `onSelectTask(id)`, `onSelectReminder(id)`, `onSelectDay(date)` | Grille 7 x 5-6. |
| `DayCell` | `date: LocalDate`, `isToday`, `isCurrentMonth`, `tasks: Task[]`, `reminders: ReminderOccurrence[]`, `maxVisible?: number` (défaut 3), handlers de sélection | `+ n autres` au-delà. |
| `PlanDayPanel` | `date: LocalDate`, `slots: PlanSlot[]`, `tasks: Task[]`, `onCreate(input: SlotInput)`, `onUpdate(id, input)`, `onRemove(id)`, `onDateChange?(date)` | Résultats `Result<PlanSlot & { overlaps: boolean }, SlotInput>` ; `overlaps` affiche l'avertissement. |
| `SlotForm` | `date: LocalDate`, `initial?: PlanSlot`, `tasks: Task[]`, `onSubmit(input: SlotInput)`, `onCancel()` | Voir 3.7. |

### 4.6 `components/reminders`

| Composant | Props | Notes |
|---|---|---|
| `ReminderList` | `upcoming: Reminder[]`, `past: Reminder[]`, `missed: ReminderEvent[]`, `tasksById: Record<ID, Task>`, `onEdit(id)`, `onDelete(id)` | Deux sections. Un manqué est relié à son rappel par `reminderId` ; si le rappel a été supprimé : libellé "Rappel supprimé". |
| `ReminderForm` | `initial?: Reminder`, `defaultTaskId?: ID`, `tasks: Task[]`, `onSubmit(input: ReminderInput): Promise<Result<Reminder, ReminderInput>>`, `onDelete?(id)`, `onClose()` | Voir 3.6. |
| `NotificationBanner` | `permission: PermissionState`, `onRequest(): Promise<PermissionState>` | Variante selon permission, section 7. |
| `MissedBanner` | `missed: ReminderEvent[]`, `titles: Record<ID, string>`, `onAcknowledge(eventId: string)`, `onAcknowledgeAll()` | Affiche uniquement les `acknowledged === false`. Boutons "Fermer" par ligne et "Tout fermer". |

---

## 5. Tokens (Tailwind)

Déclarés dans `src/app/globals.css` (bloc `@theme` de Tailwind v4 ; en v3, mêmes noms sous `theme.extend`). Valeurs lues sur la maquette puis ajustées pour le contraste.

### 5.1 Couleurs

| Token | Hex | Classe Tailwind | Usage |
|---|---|---|---|
| `canvas` | `#F3F7FE` | `bg-canvas` | Fond de page (bleu très clair) |
| `stage` | `#E9F0FC` | `bg-stage` | Grand panneau central |
| `surface` | `#FFFFFF` | `bg-surface` | Cartes, modales, champs |
| `line` | `#DCE6F7` | `border-line` | Filets, séparateurs de Gantt |
| `ink` | `#0F172A` | `text-ink` | Titres, texte principal |
| `body` | `#334155` | `text-body` | Texte courant |
| `muted` | `#475569` | `text-muted` | Texte secondaire sur canevas/scène (contraste >= 4,5) |
| `subtle` | `#64748B` | `text-subtle` | Texte secondaire sur **blanc uniquement** |
| `brand` | `#2563EB` | `bg-brand`, `text-brand` | Actions primaires, élément actif |
| `brand-soft` | `#DBE8FD` | `bg-brand-soft` | Fonds actifs, survol |

Couleurs d'accent des tâches (4 familles, chacune : *fort* pour la progression et le texte blanc, *doux* pour la piste pastel, *encre* pour texte sur doux) :

| Accent | Fort | Doux | Encre | Classes |
|---|---|---|---|---|
| `ocean` (bleu) | `#2563EB` | `#9DBDF5` | `#1E3A8A` | `bg-ocean`, `bg-ocean-soft`, `text-ocean-ink` |
| `grape` (violet) | `#7C3AED` | `#C9B6F8` | `#4C1D95` | `bg-grape`, `bg-grape-soft`, `text-grape-ink` |
| `orchid` (rose) | `#C026D3` | `#F2B1F0` | `#701A75` | `bg-orchid`, `bg-orchid-soft`, `text-orchid-ink` |
| `sun` (ambre) | `#F5B31B` | `#FBE2A1` | `#78350F` | `bg-sun`, `bg-sun-soft`, `text-sun-ink` |

Statuts (colonnes, puces, formulaire) :

| Statut | Couleur | Texte sur blanc |
|---|---|---|
| Brouillon | `#06B6D4` (cyan) | `#0E7490` |
| En cours | `#2563EB` | `#1D4ED8` |
| En édition | `#7C3AED` | `#6D28D9` |
| Terminé | `#16A34A` | `#15803D` |

Sémantique : succès `#15803D`, avertissement texte `#B45309` sur fond `#FEF3C7`, danger `#DC2626` (texte `#B91C1C`) sur fond `#FEE2E2`, info `#1D4ED8` sur `#DBEAFE`. Étoile favori : `#F5B31B`.

Dégradé de progression des cartes : `bg-gradient-to-r from-ocean to-grape`.

### 5.2 Rayons

| Token | Valeur | Classe | Usage |
|---|---|---|---|
| `radius-stage` | 32 px | `rounded-[32px]` | Scène centrale, modales |
| `radius-card` | 24 px | `rounded-3xl` | Cartes Kanban, rappels, widgets |
| `radius-control` | 16 px | `rounded-2xl` | Champs, créneaux, lignes de sous-tâche, cellules du calendrier |
| `radius-pill` | 9999 px | `rounded-full` | Barres Gantt, boutons, puces, étiquettes de tâche, segmentés |

### 5.2b Ombres

| Token | Valeur | Classe |
|---|---|---|
| `shadow-card` | `0 8px 24px -8px rgb(37 99 235 / 0.16), 0 2px 6px rgb(15 23 42 / 0.04)` | `shadow-card` |
| `shadow-card-lg` | `0 20px 40px -12px rgb(37 99 235 / 0.25)` | `shadow-card-lg` (carte en glissement, modales) |
| `shadow-pill` | `0 6px 16px -6px rgb(15 23 42 / 0.18)` | `shadow-pill` (étiquettes Gantt) |

Aucune bordure forte : la séparation vient de l'ombre et du contraste blanc/bleu clair.

### 5.3 Espacements

Échelle Tailwind standard (4 px). Valeurs imposées :

| Usage | Valeur |
|---|---|
| Marge de page | `px-8` (desktop), `px-4` (mobile) |
| Padding de la scène | `p-6` |
| Padding d'une carte | `p-5` |
| Écart entre cartes / colonnes | `gap-6` |
| Écart intra-carte | `gap-3` |
| Hauteur de ligne Gantt | 56 px + `gap-3` entre lignes |
| Largeur sidebar / réduite / panneau droit | 240 / 72 / 320 px |
| Cible tactile minimale | 44 x 44 px |

### 5.4 Typographie

| Rôle | Police | Taille / graisse | Classes |
|---|---|---|---|
| Titre de page | Montserrat | 32 px / 800 | `font-display text-3xl font-extrabold` |
| Titre de section (panneau droit, carte) | Montserrat | 14-16 px / 700 | `font-display text-sm font-bold` |
| En-tête de colonne Kanban, sidebar | Montserrat | 11-12 px / 700, capitales, `tracking-[0.2em]` | `uppercase text-xs font-bold` |
| Texte courant | Inter | 14 px / 400-500 | `font-sans text-sm` |
| Texte secondaire, dates | Inter | 12 px / 500 | `text-xs` |
| Chiffres (pourcentages, heures) | Montserrat | 700, `tabular-nums` | `font-display font-bold tabular-nums` |

Polices via `next/font/google` (Montserrat 500/700/800, Inter 400/500/600), auto-hébergées au build : pas de dépendance externe à l'exécution, gratuit (contrainte section 10 de l'architecture). Taille minimale de texte : 11 px, réservée aux libellés non critiques ; tout le reste >= 12 px.

### 5.5 Mouvements
Transitions 150-200 ms (`transition duration-150 ease-out`). Respect de `prefers-reduced-motion` : pas d'animation de déplacement, apparition instantanée (classes `motion-reduce:transition-none`).

---

## 6. Dashboard : anneaux et histogramme

### 6.1 Anneaux d'efficacité : plafond et sélection

**Plafond (paramètre `limit` de `computeRings`)**
- Panneau droit : **`limit = 4`** (comme la maquette : 4 anneaux de 48 px sur une ligne).
- Page Tableau de bord : **`limit = 8`** (2 lignes de 4, anneaux de 96 px).
- Si le nombre de tâches dépasse le plafond : lien "Voir toutes les tâches (n)" sous les anneaux, qui mène à `/tasks`. `n` = nombre total de tâches, fourni par le conteneur via `useTasks()` (`totalTasks`).

**Sélection et ordre (règle à appliquer dans `computeRings`, domain/stats.ts)** : trier par clé composée, puis tronquer à `limit` :
1. Tâches non terminées avant les tâches terminées (`status !== 'done'` d'abord) ;
2. Favoris avant non-favoris ;
3. `updatedAt` décroissant (les plus récemment touchées d'abord).
Les tâches terminées (anneau à 100 %) ne remplissent donc le plafond que s'il manque des tâches actives.

**Rendu d'un anneau**
- Cercle SVG `stroke-dasharray`, épaisseur 6 px (`sm`) / 10 px (`lg`), piste en couleur douce de la tâche, arc en couleur forte, bouts arrondis (`stroke-linecap: round`), départ en haut (12 h), sens horaire.
- Valeur `percent` au centre en gras (`75`, sans le signe % en `sm` pour tenir dans 48 px ; avec `%` en `lg`).
- Libellé : initiale de la tâche en gras sous l'anneau en `sm` (comme A/B/C/D), **titre tronqué sur 2 lignes** en `lg`. Le titre complet figure toujours dans `aria-label` et l'infobulle.
- Couleur : accent de la tâche (`taskAccent`), identique à sa barre Gantt.
- Interaction : clic/Entrée sur un anneau ouvre la tâche (`onSelect`).
- Accessibilité : chaque anneau est un bouton avec `aria-label="Refonte du site, 75 % de progression"` ; le groupe est `role="list"`.

### 6.2 Histogramme des tâches terminées

**Données** : `completedPerDay(tasks, 7, today)` renvoie 7 `BarDatum` consécutifs, du jour J-6 (gauche) à aujourd'hui (droite). La date retenue est `completedAt`. Une tâche repassée hors de Terminé disparaît du décompte.

**Présentation**
- Axe X : les 7 jours, libellé sur deux lignes : jour abrégé (`lun.`, `mar.`…) puis numéro (`05`). Aujourd'hui : libellé en gras bleu avec "Auj." à la place du jour abrégé.
- Axe Y : **pas d'axe ni de grille** (comme la maquette). La valeur numérique du jour figure **au-dessus de chaque barre** en gras 12 px (`tabular-nums`). Échelle : hauteur proportionnelle à `count`, le maximum de l'échelle est `max(max(count), 3)` pour éviter qu'un seul `1` remplisse tout.
- Barres : arrondies en haut et en bas (`rx` = demi-largeur), largeur 20 px (`sm`) / 32 px (`lg`), espacement égal. Barre d'aujourd'hui en `ocean` plein ; les 6 autres en `ocean-soft` ; le **meilleur jour** (si `count > 0`) en `grape` pour rappeler le jeu de deux tons de la maquette. Zéro : tronçon gris `#CBD5E1` de 4 px de haut avec valeur `0` en `muted`.
- Hauteur du graphique : 140 px (`sm`), 240 px (`lg`).
- En-tête de la carte : "Tâches terminées" et à droite "7 derniers jours · {total} au total".
- Pas d'auteurs, pas de paires de barres : la maquette en avait pour A/B/C/D, qui n'existent pas pour un utilisateur unique (AMB-18).
- Accessibilité : `role="img"` avec `aria-label` global ("Tâches terminées sur 7 jours : lundi 5 : 2, mardi 6 : 0…") et un tableau équivalent masqué visuellement (`sr-only`) ; bouton "Voir en tableau" (Should) qui l'affiche.
- État vide (aucune terminée sur 7 jours) : barres fantômes grisées et message "Aucune tâche terminée ces 7 derniers jours" (CA-D2.3).

---

## 7. États

### 7.1 Tableau des états par écran

| Écran / composant | Chargement | Vide | Erreur |
|---|---|---|---|
| Tous (hooks `undefined`) | `Skeleton` à la forme du contenu (cartes grises pulsées, `motion-safe:animate-pulse`) | : | : |
| Kanban | 4 colonnes avec 2 `Skeleton card` | Colonne vide : zone en pointillés `rounded-3xl border-2 border-dashed border-line`, texte "Aucune tâche" + bouton "+ Ajouter". Aucune tâche du tout : `EmptyState` central "Aucune tâche pour l'instant. Créez votre première tâche pour la voir ici et dans le planning." + **Créer une tâche** | Échec d'écriture (déplacement) : la carte revient à sa place, toast `error` "Impossible de déplacer la tâche. Réessayez." |
| Gantt | Lignes squelettes | `EmptyState` "Aucune tâche à afficher. Les tâches créées apparaissent ici avec leurs dates." + bouton | Idem toast |
| Aucune tâche dans la fenêtre visible | : | Bandeau discret dans le Gantt "Aucune tâche sur cette période" + bouton **Aujourd'hui** | : |
| Calendrier | Grille grise | Mois sans élément : grille normale (pas d'état vide bloquant) | : |
| Plan du jour | 2 créneaux squelettes | "Rien de prévu aujourd'hui" + **+ Créneau** | Erreur de validation sous le champ |
| Anneaux | 4 cercles squelettes | "Pas encore de tâche à suivre." + lien "Créer une tâche" ; aucun anneau factice | : |
| Histogramme | Barres squelettes | Voir 6.2 | : |
| Rappels | Cartes squelettes | `EmptyState` "Aucun rappel. Créez un rappel pour être prévenu à l'heure dite." + **Nouveau rappel** ; section "Passés" vide : "Aucun rappel passé." | Toast d'erreur d'enregistrement |
| Stockage inaccessible (IndexedDB bloquée, navigation privée de certains navigateurs) | : | : | **Écran d'erreur plein contenu** : "Reminder ne peut pas enregistrer vos données sur cet appareil." + explication "Le stockage local du navigateur est indisponible (navigation privée ou stockage bloqué)." + bouton **Réessayer**. Aucune donnée n'est affichée comme si tout allait bien. |
| Quota / échec d'écriture | : | : | Toast `error` "Enregistrement impossible : espace de stockage insuffisant ou refusé." |

### 7.2 Notifications (permission, bandeau, rappel manqué)

`NotificationBanner`, bandeau en haut de l'écran Rappels (et rappel compact dans `ReminderForm`). Quatre variantes selon `PermissionState` :

| État | Apparence | Texte | Action |
|---|---|---|---|
| `default` | Carte `info` (fond `#DBEAFE`, icône cloche), `rounded-3xl` | Titre : "Activez les notifications pour ne rien oublier". Texte : "Reminder vous prévient à l'heure de chaque rappel. Le navigateur va vous demander l'autorisation." | **Activer les notifications** (déclenche `requestPermission`, jamais au chargement) |
| `granted` — **bandeau « notifications actives, application ouverte »** | Bandeau fin, fond `#DCFCE7`, texte `#15803D`, icône cloche pleine, **permanent**, non fermable (CA-R5.5) | "Notifications actives. Elles ne sont envoyées que lorsque Reminder est ouvert dans un onglet du navigateur." | Aucune. Ajouter à côté un point vert "Actif". |
| `denied` | Carte `avertissement` (fond `#FEF3C7`, icône cloche barrée) | Titre : "Les notifications sont bloquées". Texte : "Vos rappels s'afficheront ici, dans l'application, mais vous ne recevrez pas d'alerte système. Pour les réactiver, autorisez les notifications pour ce site dans les réglages de votre navigateur (icône de cadenas dans la barre d'adresse)." | Aucun bouton (impossible à contourner) ; lien "Comment faire ?" qui déplie 3 étapes (Should). |
| `unsupported` | Carte neutre grise | "Votre navigateur ne gère pas les notifications. Les rappels restent visibles dans l'application." | Aucune |

Dans tous les cas, la pastille de l'en-tête reflète l'état (vert "Notifications actives" ou ambre "Notifications désactivées").

**Repli in-app (`denied` ou `unsupported`)** : à l'heure du rappel, application ouverte, un toast persistant (jusqu'à fermeture) s'affiche en bas à droite : "Rappel : {titre} · {heure}" avec bouton **Voir**. Le rappel passe dans "Passés" avec la pastille "Déclenché".

**Rappel manqué (`MissedBanner`)** : bandeau ambre (`#FEF3C7`, icône horloge) à la réouverture, au-dessus du contenu de **toutes** les pages tant qu'il reste des manqués non acquittés.
- Titre : "Vous avez manqué {n} rappel(s)". Une ligne par occurrence : "{titre} · prévu le {jj mois} à {HH:mm}" + bouton **Fermer** (`acknowledgeMissed`). Bouton **Tout fermer**.
- Au-delà de 3 lignes : "+ n autres" qui mène à `/reminders` (section Passés et manqués).
- Pour un rappel récurrent : mention "récurrent, prochaine occurrence le {date}".
- Aucune notification système n'est émise pour un manqué (CA-R5.6).

### 7.3 Autres états
- **Validation** : erreur par champ, message en `text-red-700` 12 px précédé d'une icône (pas la couleur seule), contour du champ `border-red-600`, `aria-invalid="true"`.
- **Soumission** : bouton primaire en `loading` (désactivé, spinner), formulaire non modifiable.
- **Succès** : toast `success` (5 s) : "Tâche enregistrée", "Rappel créé", "Tâche supprimée".
- **Hors ligne** : aucun impact (données locales) ; pas de message.

---

## 8. Accessibilité

### 8.1 Clavier
- Ordre de tabulation = ordre visuel : skip link "Aller au contenu" -> sidebar -> en-tête -> contenu -> panneau droit.
- Focus visible partout : `focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2` (offset de la couleur du fond local) ; ne jamais supprimer l'outline sans le remplacer.
- Modales : focus piégé, Échap ferme, focus rendu au déclencheur. `ConfirmDialog` : focus initial sur Annuler.
- Menus (`StatusMenu`, popovers) : Entrée/Espace ouvre, flèches naviguent, Échap ferme.
- Calendrier : la grille est un `role="grid"` navigable aux flèches (jour par jour), Entrée ouvre le détail, PageUp/PageDown change de mois.
- Segmentés : flèches pour changer d'option (comportement radiogroup).

### 8.2 Alternative au glisser-déposer (CA-K2.4)
Trois chemins équivalents pour changer le statut :
1. **Menu `⋮` > Changer de statut** sur chaque carte (4 entrées, la courante cochée) : fonctionne clavier, tactile, lecteur d'écran. C'est l'alternative **obligatoire**.
2. **Glisser-déposer au clavier** (dnd-kit `KeyboardSensor`) : Espace/Entrée sur la poignée (la carte est focusable) pour saisir, flèches gauche/droite pour changer de colonne, haut/bas pour réordonner, Espace pour déposer, Échap pour annuler.
3. **Champ Statut** du `TaskForm`.

Annonces `aria-live="assertive"` en français (via `announcements` de dnd-kit) : "Tâche {titre} saisie, position {n} dans la colonne {statut}.", "Tâche {titre} déplacée dans la colonne {statut}, position {n}.", "Déplacement annulé, {titre} reste dans {statut}."

Gantt et calendrier sont en lecture seule : aucune interaction de glissement à compenser.

### 8.3 Contrastes (WCAG 2.2 AA : texte >= 4,5:1, grands textes et éléments graphiques >= 3:1)
Rapports calculés approximativement, à valider à l'intégration avec un outil :
- `ink` / `body` sur blanc et sur `stage` : > 10:1 et > 8:1.
- `muted` (`#475569`) sur `canvas` / `stage` : ~7:1. `subtle` (`#64748B`) sur blanc : ~4,8:1 ; **interdit sur `stage`/`canvas`** (sous 4,5).
- Texte blanc sur `ocean` : ~5,2:1 ; sur `grape` : ~5,7:1 ; sur `orchid` : ~4,7:1. **Sur `sun` (ambre) : texte `sun-ink` (`#78350F`), jamais blanc** : ~6,5:1.
- Texte sur pistes douces : utiliser l'encre de l'accent (`*-ink`), > 7:1.
- `slate-400` et plus clair : uniquement décoratif (jamais du texte).
- Vert `#16A34A` seul est un graphique (3,3:1) : le texte vert utilise `#15803D`.
- **Jamais la couleur seule** : un statut = texte + couleur ; un état de notification = texte + icône ; une erreur = icône + message ; un chevauchement = icône + texte ; la progression = pourcentage numérique.

### 8.4 Lecteurs d'écran et sémantique
- Gantt : `role="table"` ; une ligne par tâche, cellule 1 = titre, cellule 2 = "du 28 oct. au 2 nov., 55 % terminé, statut En cours". Les barres visuelles sont `aria-hidden`.
- Anneaux : `role="list"`, chaque anneau `role="listitem"` + libellé complet. Histogramme : `role="img"` + tableau `sr-only` (6.2).
- Compteurs : "3 commentaires, 2 pièces jointes". Étoile : `aria-pressed` + "Favori". Pastilles-initiales : `aria-hidden`.
- Régions `aria-live="polite"` pour les toasts de succès, `assertive` pour les erreurs et les rappels déclenchés.
- Un seul `h1` par page ; sections en `h2` ; cartes de tâche en `article` avec `h3` pour le titre.
- Cibles tactiles >= 44 px ; zoom 200 % sans perte de contenu ni défilement horizontal de page (hors Gantt, qui défile dans son conteneur).
- `prefers-reduced-motion` respecté ; aucune animation clignotante.
- Langue du document : `<html lang="fr">`. Champs date/heure natifs (`type="date"`, `type="time"`) pour bénéficier des sélecteurs accessibles du navigateur.

---

## 9. Responsive

Desktop d'abord. Breakpoints Tailwind : `sm` 640, `md` 768, `lg` 1024, `xl` 1280, `2xl` 1536.

| Largeur | Mise en page |
|---|---|
| **>= 1280 (`xl`)** : référence | Sidebar 240 + contenu fluide + panneau droit 320, comme la maquette. Kanban 4 colonnes. |
| **1024-1279 (`lg`)** | Sidebar réduite aux icônes (72 px). Le panneau droit passe **sous** la scène en grille de 2 colonnes de cartes (Plan + Efficacité / Histogramme), ou devient un tiroir "Aujourd'hui" ouvert par un bouton de l'en-tête (au choix du front, comportement identique). Kanban 4 colonnes serrées (min 220 px chacune). |
| **768-1023 (`md`)** tablette, dégradé | Sidebar en icônes. Panneau droit en tiroir. Kanban : défilement horizontal avec `snap-x`, colonnes de 280 px. Gantt `full` : défilement horizontal, colonne d'étiquettes réduite à l'avatar + titre sur 1 ligne (200 px). Calendrier : grille complète, 2 éléments visibles par jour puis "+ n". Glisser-déposer tactile actif (délai 200 ms) **et** menu de statut. |
| **< 768 (`sm` et moins)** mobile, dégradé | Sidebar remplacée par une **barre d'onglets fixe en bas** (4 entrées icône + libellé court : Accueil, Tâches, Planning, Rappels). Panneau droit supprimé : Plan du jour affiché comme carte en tête de Tableau de bord et dans un tiroir "Aujourd'hui" (bouton de l'en-tête). Kanban : **un onglet/segmenté par statut** (une colonne visible à la fois, compteur dans chaque onglet) ; **pas de glisser-déposer** : changement de statut par le menu `⋮` uniquement. Gantt : défilement horizontal dans la carte, étiquette réduite à l'initiale (titre en `aria-label` et au toucher). Calendrier : grille avec **points colorés** (pas de texte) ; toucher un jour ouvre la liste du jour en feuille basse. Formulaires : feuille plein écran, boutons Enregistrer/Annuler collés en bas. Anneaux : grille 2 x 2 (`limit` inchangé, voir 6.1). |

Règles transverses : marges 16 px en mobile ; textes jamais sous 12 px ; les bandeaux (`NotificationBanner`, `MissedBanner`) restent pleine largeur et empilés ; aucun défilement horizontal de la page (seuls Gantt et Kanban tablette défilent dans leur conteneur). Sur mobile, un rappel : les notifications dépendent de la plateforme (iOS réservé aux PWA installées, voir ARCHITECTURE.md section 6) ; le message "ne fonctionne que si Reminder est ouvert" reste affiché.

---

## 10. Points à signaler

**À l'architecte / backend**
1. `computeRings` doit appliquer la règle de tri et de troncature du 6.1 (tâches actives d'abord, favoris, `updatedAt` décroissant). Demande : que `useDashboard` accepte `ringsLimit` (4 panneau, 8 page) ; à défaut le front appelle `computeRings(tasks, limit)` avec `useTasks()`.
2. `ReminderEvent` ne porte pas le titre du rappel : le front le retrouve via `reminderId` dans `useReminders()` ; un rappel supprimé s'affiche "Rappel supprimé". Alternative : dupliquer `title` dans l'événement.
3. `taskAccent(id)` (couleur stable d'une tâche) est un helper front dans `lib/`, sans impact sur le modèle.
4. Le toast in-app de rappel déclenché (repli permission refusée) a besoin d'un signal côté scheduler (événement ou hook sur les `ReminderEvent` récents) en plus de la notification système.

**Au PM / client**
- AMB-08 : afficher ou non le compteur de pièces jointes dépend de la décision.
- AMB-13 : chevauchement de créneaux autorisé avec avertissement (retenu ici) ; sélecteur de jour dans le Plan en Should.
- Position du plafond des anneaux (4 / 8) et règle de sélection : à valider par le client, simple constante.
- Police Montserrat : choisie pour sa proximité avec la maquette (déduction visuelle, non vérifiée par le client).
