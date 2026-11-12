# Rapport QA : Reminder (MVP)

Date : 2026-11-11. Périmètre : SPEC.md (CA-*), code existant. Aucun code applicatif modifié.

## 1. Résultats des commandes

| Commande | Résultat |
|---|---|
| `npm test` (avant mes ajouts) | 4 fichiers, 81 tests, tous OK |
| `npx vitest run` (après ajout de `tests/unit/qa-gaps.test.ts`) | 5 fichiers, 124 tests : 123 OK, 1 KO (BUG-01, volontaire) |
| `npx tsc --noEmit` | 0 erreur |
| `npm run lint` | 0 erreur, 1 warning : `src/domain/stats.ts` 4:68 `'Task' is defined but never used` |
| `npm run build` | OK (Next 16.4.6 Turbopack) ; routes statiques `/`, `/planning`, `/reminders`, `/tasks`, `/_not-found` |
| `curl` sur le serveur dev (3000) | `/`, `/tasks`, `/planning`, `/reminders` répondent 200 (rien de plus) |
| `prettier --check tests` | avertissements de style sur 6 fichiers (non bloquant, pas de config imposée) |

## 2. Tests ajoutés

`tests/unit/qa-gaps.test.ts` (43 tests, Vitest + fake-indexeddb, TZ Europe/Paris, aucune dépendance ajoutée) : utilitaires de dates, récurrence (hebdo, mensuel 30, DST, 3 ans d'absence), schémas (bornes 200/2000 caractères, progression texte/NaN/null), règles de tâche, services tâches/rappels/créneaux (rattrapage, limite exacte 5 min, hebdo manqué 3 semaines, anti-doublon, modification d'heure, suppression), stats (histogramme après réouverture), sauvegarde (fichiers invalides, doublons d'id atomiques), profil.

Pas de tests de composants ni e2e : l'outillage (jsdom, Testing Library, Playwright) n'est pas installé ; je n'ai pas ajouté de grosse dépendance. À envisager : Playwright (dépendance lourde, à valider).

## 3. Recette manuelle / visuelle

**Non réalisée.** Les outils navigateur (mcp__Claude_Browser__*) ne sont pas disponibles dans mon environnement. Rien n'a été vérifié visuellement ni par interaction UI : formulaires, Kanban (menu de statut, glisser-déposer), Gantt, calendrier, plan du jour (rendu de l'avertissement de chevauchement), dashboard, bandeau « manqué », notification système, fidélité à la maquette. Seule la couche domaine/services est couverte par tests automatisés ; les cases UI du tableau ci-dessous sont donc « non vérifié ».

## 4. Bilan par critère

Légende : OK = vérifié par test automatisé (services/domaine) ; NV = non vérifié (UI ou navigateur requis).

| CA | Statut | Détail |
|---|---|---|
| R1.1 formulaire | NV | UI |
| R1.2 / R1.3 validations | OK (service) | titre vide/espaces refusé, rien écrit ; message d'erreur UI non vérifié |
| R1.4 apparition sans rechargement | NV | UI/liveQuery |
| R1.5 persistance | OK (IndexedDB simulé) | persistance réelle navigateur NV |
| R1.6 lien tâche optionnel | OK (service) ; liste sur fiche tâche NV |
| R1.7 détachement à la suppression | OK (service) ; message de confirmation NV |
| R2.1 tous champs modifiables | KO partiel | BUG-01 (heure d'une série récurrente ancienne) |
| R2.2 mêmes validations | OK (service) |
| R2.3 nouvelle heure seulement | OK (service) |
| R3.1 confirmation | NV |
| R3.2 suppression et plus de déclenchement | OK (service) |
| R4.1 options de récurrence | OK (schéma refuse `yearly`) ; sélecteur NV |
| R4.2 / R4.3 / R4.4 / R4.5 | OK (J+1, J+7 même jour de semaine, clamp fin de mois et retour au quantième, bissextile, DST) |
| R5.1 invite explicite | NV (état de l'invite testé côté settings seulement) |
| R5.2 notification à l'heure (tolérance 60 s) | NV (le scheduler est testé en horloge simulée ; l'affichage système ne l'est pas) |
| R5.3 permission refusée / repli | NV |
| R5.4 anti-doublon | OK (service : clé d'événement, traitements concurrents) ; deux onglets réels NV |
| R5.5 mention « onglet ouvert » | NV |
| R5.6 manqué > 5 min, la plus récente seule | OK (limite 5 min exacte et +1 ms, hebdo 3 semaines) ; bandeau et fermeture NV |
| R6.1 / R6.2 listes | OK (queries) ; rendu NV |
| T1.1 à T1.3 | OK (service) ; messages par champ en UI NV |
| T1.4 apparition Kanban/Gantt/calendrier | NV (données OK) |
| T2.1 / T2.2 / T2.4 | OK (service, cascade sous-tâches/commentaires, rappels conservés) ; confirmations NV |
| T2.3 répercussion sans rechargement | NV |
| T3.1 / T3.3 | OK (4 statuts, done force 100 %, completedAt) ; ordre des libellés UI NV |
| T3.2 formulaire + Kanban cohérents | OK (service) ; UI NV |
| T4.1 | OK (service) ; T4.2 affichage NV |
| T5.1 favori | OK (toggle service) ; T5.2 clic sans ouvrir NV |
| T6.1 / T6.2 compteurs | OK (builder cartes) ; rendu NV |
| T7.1 / T7.2 / T7.4 | OK (service) ; T7.3 rendu NV |
| K1.1 à K1.4 | OK (board 4 colonnes, vide OK) ; rendu NV |
| K2.1 / K2.2 / K2.5 | OK (service move, rééquilibrage) |
| K2.3 annulation du drop, K2.4 menu statut | NV |
| P1.1 à P1.6 Gantt | NV (aucune logique Gantt testée ; elle est dans le composant) |
| P2.1 / P2.4 calendrier | NV ; P2.2 / P2.3 données OK (loadCalendarEntries) |
| P3.1 / P3.3 / P3.4 | OK (tri, fin > début, minuit refusé, persistance par jour) ; affichage « HH:MM - HH:MM » NV |
| P3.2 CRUD créneaux | OK (service) ; UI NV |
| P3 chevauchement avec avertissement | OK (flag `overlaps`) ; rendu NV |
| D1.1 / D1.2 / D1.3 anneaux | OK (computeRings) ; rendu NV |
| D2.1 à D2.3 histogramme | OK (completedPerDay, réouverture) ; rendu NV |
| D3.1 profil | OK (service) ; rendu NV |
| ET-1 persistance | OK (simulé) |
| ET-2 cohérence entre vues | NV |
| ET-3 fuseau local | OK (tests en Europe/Paris) |
| ET-4 / ET-5 / ET-7 / ET-8 | NV (build OK, aucun service payant dans package.json) |
| ET-6 états vides / erreurs | partiel : états vides côté données OK, affichage NV |

## 5. Bugs reproductibles

### BUG-01 (moyenne) : impossible de changer l'heure d'un rappel récurrent déjà commencé
- Agent : backend (`src/data/services/reminders.ts`, fonction `save`, test AMB-04 `anchorChanged`).
- Étapes (reproduites par `tests/unit/qa-gaps.test.ts`, test « recurrent : changer l'heure d'une serie dont le debut est passe ») : créer un rappel quotidien à 09:00 démarrant le 1er mai ; le 10 mai à 12:00, le modifier en 18:00 sans toucher à la date de début.
- Attendu (CA-R2.1, CA-R4.5) : modification acceptée, prochaine occurrence le 10 mai à 18:00.
- Obtenu : `{ ok: false, errors: { startDate: "La date et l'heure doivent être dans le futur." } }`. L'utilisateur doit déplacer artificiellement la date de début dans le futur, ce qui décale l'ancre de la série (et donc, pour hebdo/mensuel, le jour de la série).
- Piste : n'appliquer le refus « passé » que si l'instant de la prochaine occurrence est dans le passé ; pour une série récurrente, valider `nextOccurrenceAfter(rule, now)` plutôt que l'ancre.

### BUG-02 (faible) : warning ESLint
- `src/domain/stats.ts` ligne 4 : import `Task` inutilisé. Agent : backend. Trivial.

### Points à signaler (non bloquants, non vérifiés visuellement)
- `move()` vers la même colonne sans `beforeId` repositionne la carte en fin de colonne ; le SPEC (CL K2) attend « aucun effet » pour un déplacement vers la même colonne. À confirmer côté UI (frontend) : le menu de statut devrait ignorer la sélection du statut courant (non vérifié).
- Aucun test de composant/e2e : la partie UI (CA-K2.3/K2.4, Gantt, calendrier, notifications, bandeau « manqué ») reste entièrement à recetter par un humain ou avec Playwright.

## 6. Fichiers
- `G:\Asa\Projects\Reminder\tests\unit\qa-gaps.test.ts` (nouveau)
- `G:\Asa\Projects\Reminder\docs\QA-REPORT.md` (ce rapport)
