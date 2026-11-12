# Brief client : Reminder

## Vision

Application web personnelle de rappels, gestion de tâches et planning, gratuite à héberger.
Interface de référence fournie par le client : tableau de bord "Task Management" (voir ci-dessous).

## Décisions client

- Type : application web
- Stack : Next.js (TypeScript)
- Livraison : MVP rapide
- Utilisateur : un seul (usage personnel, pas de comptes)
- Alertes : notifications navigateur
- Hébergement : gratuit avant tout (ex. Vercel)

## Fonctionnalités MVP

1. **Rappels** : créer, modifier, supprimer (titre, date, heure, note), récurrents (quotidien, hebdomadaire, mensuel), notification navigateur à l'heure dite
2. **Gestion de tâches** : tâches avec statut (Brouillon, En cours, En édition, Terminé), progression en %, étoile/favori, compteurs de commentaires et pièces jointes, sous-tâches
3. **Vue Kanban** : colonnes par statut, déplacement des tâches d'une colonne à l'autre
4. **Planning** :
   - Vue Gantt/timeline : barres de durée par tâche avec % d'avancement, échelle par jour
   - Vue calendrier
   - Plan du jour : créneaux horaires (ex. 12:00-13:00)
5. **Tableau de bord** : indicateurs d'efficacité (anneaux de progression), tâches terminées (histogramme)

## Interface de référence (docs/reference/1.png)

- Barre latérale gauche : Dashboard, Tasks, Planning, Analytics (+ Message, Global, Finance dans la maquette)
- En-tête : fil d'Ariane "Tasks > Today", titre de page
- Zone centrale : Gantt arrondi coloré (barres pastel + progression foncée) puis 4 colonnes Kanban en cartes blanches
- Panneau droit : profil, plan du jour, anneaux d'efficacité, histogramme des tâches terminées
- Style : fond bleu très clair, cartes blanches très arrondies avec ombre douce, couleurs vives (bleu, violet, rose, jaune), typographie moderne

À valider : Message, Global et Finance ne correspondent à aucune fonctionnalité demandée ; ils sont exclus du MVP sauf avis contraire.

## Arbitrages client (phase 1)

- Notifications : app ouverte suffisante (pas de push onglet fermé) ; rappels manqués affichés à la réouverture
- Rappel lié à une tâche : oui, optionnel
- Dates de début et fin des tâches : obligatoires (toute tâche apparaît dans le Gantt)
- Anneaux d'efficacité : progression par tâche/projet

## Hors périmètre MVP

Comptes, partage/équipes, messagerie, finance, email/SMS, multi-langue (menu Language de la maquette), tarifs.

## Points à trancher (architecte)

- Stockage : IndexedDB/localStorage (sans serveur) vs base gratuite.
- Notifications onglet fermé : Service Worker + PWA, limites du plan gratuit (cron Vercel Hobby limité).
- Bibliothèque pour Gantt et glisser-déposer Kanban (ex. dnd-kit) vs implémentation maison.
- Lien entre rappels et tâches (un rappel peut-il être attaché à une tâche ?).

## Répartition

| Phase | Agent     | Livrable                                                    |
| ----- | --------- | ----------------------------------------------------------- |
| 1     | pm        | User stories + critères d'acceptation (docs/SPEC.md)        |
| 1     | architect | Choix techniques + structure (docs/ARCHITECTURE.md)         |
| 2     | designer  | Écrans fidèles à la référence + composants (docs/DESIGN.md) |
| 3     | frontend  | Dashboard, Kanban, Gantt, calendrier, formulaires           |
| 3     | backend   | Modèle tâches/rappels, récurrence, stockage, notifications  |
| 4     | qa        | Tests + recette selon critères d'acceptation                |
| 5     | devops    | Déploiement gratuit + CI                                    |
