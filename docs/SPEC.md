# SPEC : Reminder (MVP)

Source : docs/BRIEF.md et docs/reference/1.png. Rédigé par le PM. Aucune solution technique ici (voir ARCHITECTURE.md).

## 0. Conventions

- Priorités : **Must** = indispensable au MVP ; **Should** = souhaitable, livré si le temps le permet sans retarder les Must.
- Identifiants : US-xx (user story), CA-xx.y (critère d'acceptation), CL (cas limite), AMB-xx (ambiguïté à trancher, voir section 7).
- Utilisateur unique : pas de comptes, pas de partage. Toutes les stories sont écrites pour "l'utilisateur".
- **Tranché** : AMB-01, 02, 03, 06 et 18 sont tranchés par le client (BRIEF.md "Arbitrages client", ARCHITECTURE.md section 0). Leurs critères sont fermes.
- Quand un critère dépend d'une ambiguïté encore ouverte, il est marqué **[AMB-xx]** : l'hypothèse de travail est indiquée, elle n'est pas validée.

## 1. Périmètre

**Dans le MVP** : rappels (dont récurrents et notification navigateur), tâches (statut, progression, favori, compteurs, sous-tâches), Kanban, planning (Gantt, calendrier, plan du jour), tableau de bord (anneaux, histogramme).

**Hors MVP** (brief) : comptes, partage/équipes, messagerie, finance, email/SMS, multi-langue, tarifs. Les entrées de menu Message, Global, Finance, ainsi que Pricing / About / Language / Conditions de l'en-tête de la maquette sont exclues sauf avis contraire (AMB-17).

**Navigation MVP** : Dashboard, Tasks, Planning, plus la gestion des rappels (voir AMB-16 pour l'emplacement des rappels et le sort d'"Analytics").

---

## 2. Bloc 1 : Rappels

### US-R1 (Must) Créer un rappel
En tant qu'utilisateur, je veux créer un rappel avec un titre, une date, une heure et une note, afin de ne pas oublier quelque chose à un moment précis.

- CA-R1.1 : Le formulaire contient titre, date, heure, note.
- CA-R1.2 : Titre, date et heure sont obligatoires ; la note est facultative.
- CA-R1.3 : Un titre vide ou composé uniquement d'espaces est refusé avec un message d'erreur explicite ; rien n'est enregistré.
- CA-R1.4 : Après validation, le rappel apparaît dans la liste des rappels sans rechargement manuel de la page.
- CA-R1.5 : Le rappel est toujours présent après rechargement de la page (persistance).
- CA-R1.6 (AMB-01, tranché) : Le formulaire permet, de façon facultative, de lier le rappel à une tâche existante ; un rappel sans tâche reste valide. La fiche de la tâche liste ses rappels liés.
- CA-R1.7 : Si la tâche liée est supprimée, le rappel est conservé et devient non lié (pas de suppression en cascade) ; l'utilisateur est prévenu dans la confirmation de suppression de la tâche.
- CL : date/heure dans le passé (refuser ou accepter ? AMB-04) ; titre très long (limite proposée : 200 caractères, à confirmer) ; note très longue.

### US-R2 (Must) Modifier un rappel
En tant qu'utilisateur, je veux modifier un rappel existant, afin de corriger ou de décaler l'échéance.

- CA-R2.1 : Tous les champs (titre, date, heure, note, récurrence) sont modifiables.
- CA-R2.2 : Les mêmes validations que la création s'appliquent.
- CA-R2.3 : Si la date/heure est modifiée, la notification se déclenche à la nouvelle heure et plus à l'ancienne.
- CL : modification d'un rappel déjà déclenché ; modification d'un rappel récurrent (cette occurrence seulement ou toute la série ? AMB-05).

### US-R3 (Must) Supprimer un rappel
En tant qu'utilisateur, je veux supprimer un rappel, afin de retirer ceux qui ne servent plus.

- CA-R3.1 : Une confirmation est demandée avant suppression.
- CA-R3.2 : Après suppression, le rappel disparaît de la liste, y compris après rechargement, et ne déclenche plus de notification.
- CL : suppression d'un rappel récurrent (série entière, AMB-05) ; suppression d'un rappel dont la notification est affichée.

### US-R4 (Must) Rappel récurrent
En tant qu'utilisateur, je veux qu'un rappel se répète chaque jour, chaque semaine ou chaque mois, afin de ne pas le recréer à chaque fois.

- CA-R4.1 : Options de récurrence : aucune (défaut), quotidienne, hebdomadaire, mensuelle. Aucune autre fréquence dans le MVP.
- CA-R4.2 : Après le déclenchement d'une occurrence, la prochaine occurrence est planifiée à la même heure : J+1, J+7, ou même quantième du mois suivant.
- CA-R4.3 : Hebdomadaire = même jour de la semaine que la date de départ. [AMB-05] Pas de sélection de plusieurs jours.
- CA-R4.4 : Mensuel avec quantième 29, 30 ou 31 : sur un mois plus court, l'occurrence tombe le dernier jour du mois (hypothèse, AMB-05) ; le mois suivant revient au quantième d'origine.
- CA-R4.5 : Une récurrence continue sans fin tant que le rappel n'est pas supprimé. [AMB-05] (pas de date de fin).
- CL : occurrences en retard pendant une période où l'application n'a pas été ouverte : règle de CA-R5.6 (AMB-03, tranché) ; changement d'heure été/hiver (l'heure locale affichée reste identique) ; années bissextiles.

### US-R5 (Must) Notification navigateur
En tant qu'utilisateur, je veux recevoir une notification du navigateur à l'heure du rappel, afin d'être prévenu même si je suis sur un autre onglet.

- CA-R5.1 : À la première utilisation, l'application explique le besoin puis demande la permission de notification, sur action explicite de l'utilisateur (pas de demande au chargement silencieux).
- CA-R5.2 : Si la permission est accordée et que l'application est ouverte à l'heure dite, une notification affichant le titre (et la note) apparaît à l'heure du rappel, avec une tolérance maximale de 60 secondes.
- CA-R5.3 : Si la permission est refusée ou bloquée, l'application affiche un état clair ("notifications désactivées") et un repli visible dans l'application (voir US-R6).
- CA-R5.4 : Une notification n'est émise qu'une seule fois par occurrence (pas de doublon après rechargement ou avec deux onglets ouverts).
- CA-R5.5 (AMB-02, tranché) : Les notifications ne sont garanties que lorsque l'application est ouverte dans un onglet du navigateur (visible ou non). Pas de notification navigateur/onglet fermé. L'écran Rappels l'indique en permanence ("Les notifications ne sont envoyées que lorsque Reminder est ouvert dans un onglet du navigateur.").
- CA-R5.6 (AMB-03, tranché) : À l'ouverture ou au réveil de l'application, toute occurrence échue depuis plus de 5 minutes est "manquée" : aucune notification système n'est émise, elle est affichée dans l'application (bandeau et liste "manqués"). Une échue depuis 5 minutes ou moins est déclenchée normalement. Pour un rappel récurrent ayant plusieurs occurrences en retard, seule la plus récente est journalisée comme manquée ; la suivante est replanifiée à la prochaine occurrence future. Le bandeau "manqué" peut être fermé par l'utilisateur.
- CL : permission révoquée après coup ; navigateur ne supportant pas les notifications ; plusieurs rappels à la même minute (une notification chacun) ; ordinateur en veille à l'heure dite.

### US-R6 (Should) Voir l'état des rappels
En tant qu'utilisateur, je veux voir mes rappels à venir et ceux déjà passés, afin de repérer ce que j'ai manqué.

- CA-R6.1 : La liste distingue "à venir" (triés par date croissante) et "passés / déclenchés".
- CA-R6.2 : Un rappel manqué (app fermée à l'heure dite) est affiché à la réouverture selon CA-R5.6 (AMB-03, tranché).
- CL : liste vide (message d'état vide avec invitation à créer un rappel).

---

## 3. Bloc 2 : Gestion de tâches

Hypothèse de modèle (à valider) : une tâche porte un titre, un statut, une progression (0-100 %), un favori (booléen), un compteur de commentaires, un compteur de pièces jointes, des sous-tâches, et des dates de début et de fin obligatoires, nécessaires au Gantt et au calendrier (AMB-06, tranché).

### US-T1 (Must) Créer une tâche
En tant qu'utilisateur, je veux créer une tâche avec un titre et ses dates de début et de fin, afin de la suivre dans le planning.

- CA-T1.1 : Titre obligatoire, vide ou espaces seuls refusé.
- CA-T1.2 : Statut initial par défaut : Brouillon. Progression initiale : 0 %.
- CA-T1.3 (AMB-06, tranché) : Les dates de début et de fin sont obligatoires ; leur absence est refusée avec un message par champ. La date de fin ne peut pas précéder la date de début (erreur explicite).
- CA-T1.4 : La tâche créée apparaît immédiatement dans le Kanban (colonne Brouillon), dans le Gantt et dans le calendrier. Il n'existe pas de tâche sans date.
- CL : tâche d'un seul jour (début = fin) ; titre long (affichage tronqué avec le titre complet accessible).

### US-T2 (Must) Modifier et supprimer une tâche
En tant qu'utilisateur, je veux modifier ou supprimer une tâche, afin de garder ma liste à jour.

- CA-T2.1 : Titre, dates, statut, progression et favori sont modifiables.
- CA-T2.2 : La suppression demande une confirmation et supprime aussi ses sous-tâches (la confirmation le mentionne).
- CA-T2.4 : La suppression d'une tâche conserve ses rappels liés, qui deviennent non liés (CA-R1.7) ; la confirmation le mentionne.
- CA-T2.3 : Les modifications et suppressions sont répercutées dans toutes les vues (Kanban, Gantt, calendrier, tableau de bord) sans rechargement.
- CL : suppression d'une tâche affichée dans le plan du jour (AMB-13).

### US-T3 (Must) Statut
En tant qu'utilisateur, je veux attribuer à une tâche un statut parmi Brouillon, En cours, En édition, Terminé, afin de suivre son avancement qualitatif.

- CA-T3.1 : Exactement quatre statuts, dans cet ordre : Brouillon, En cours, En édition, Terminé. Pas de statut personnalisé.
- CA-T3.2 : Le statut est modifiable depuis le formulaire de la tâche et par déplacement dans le Kanban (US-K2) ; les deux restent cohérents.
- CA-T3.3 : Quand une tâche passe à Terminé, sa progression passe à 100 %. [AMB-07] (règle inverse et autres transitions).
- CL : sens exact de "En édition" (AMB-09) ; retour de Terminé vers un autre statut (la progression reste-t-elle à 100 % ? AMB-07).

### US-T4 (Must) Progression en %
En tant qu'utilisateur, je veux renseigner la progression d'une tâche en pourcentage, afin de visualiser son avancement.

- CA-T4.1 : La progression est un entier de 0 à 100 ; toute valeur hors bornes ou non numérique est refusée ou bornée avec un message.
- CA-T4.2 : La valeur est affichée sur la carte Kanban (barre + pourcentage) et sur la barre du Gantt.
- CA-T4.3 : [AMB-07] Hypothèse : progression saisie manuellement ; pas de calcul automatique à partir des sous-tâches.
- CL : 0 % avec statut Terminé ; 100 % avec statut Brouillon (incohérence, AMB-07).

### US-T5 (Must) Favori (étoile)
En tant qu'utilisateur, je veux marquer une tâche d'une étoile, afin de repérer mes tâches importantes.

- CA-T5.1 : Un clic sur l'étoile bascule favori / non favori ; l'état est visible sur la carte et persiste après rechargement.
- CA-T5.2 : L'étoile est cliquable sans ouvrir la tâche ni la déplacer.
- Hors périmètre sauf avis : filtre ou tri par favori (AMB-10).

### US-T6 (Must) Compteurs de commentaires et de pièces jointes
En tant qu'utilisateur, je veux voir le nombre de commentaires et de pièces jointes d'une tâche, afin de savoir ce qui y est rattaché.

- CA-T6.1 : Les deux compteurs (icône + nombre) sont affichés sur la carte de la tâche, comme dans la maquette.
- CA-T6.2 : Un compteur à zéro s'affiche de façon cohérente (0 ou masqué : choix du designer, identique partout).
- **[AMB-08]** Le brief ne dit pas si l'utilisateur peut ajouter/supprimer des commentaires et des pièces jointes, ni comment les stocker. Hypothèse de travail : le MVP permet d'ajouter un commentaire texte (donc de faire évoluer le compteur) ; les pièces jointes restent à trancher. Tant que non tranché, les compteurs ne doivent pas afficher de fausses données.
- CL : taille/type de fichier maximal et espace de stockage disponible si pièces jointes (AMB-08).

### US-T7 (Must) Sous-tâches
En tant qu'utilisateur, je veux découper une tâche en sous-tâches, afin de détailler le travail à faire.

- CA-T7.1 : Depuis une tâche, on peut ajouter, renommer, cocher (faite / à faire) et supprimer des sous-tâches.
- CA-T7.2 : Un seul niveau de sous-tâches (pas de sous-sous-tâches). [AMB-11]
- CA-T7.3 : La carte de la tâche mère affiche ses sous-tâches (comme les lignes de la carte "Main Task" de la maquette) et le ratio fait/total.
- CA-T7.4 : Une sous-tâche vide est refusée.
- CL : tâche mère supprimée (cascade) ; toutes les sous-tâches cochées ne change pas automatiquement le statut de la mère, sauf règle contraire (AMB-07) ; très grand nombre de sous-tâches (défilement dans la carte).
- [AMB-11] Les sous-tâches ont-elles leur propre statut, progression, dates, assigné (lettres A/B/C/D de la maquette) ?

### US-T8 (Should) Liste et recherche
En tant qu'utilisateur, je veux trouver rapidement une tâche, afin de ne pas parcourir tout le tableau.

- CA-T8.1 : Une recherche par titre filtre les tâches affichées.
- Non présent dans le brief : à confirmer avant de l'inclure ; livré seulement si validé (AMB-10).

---

## 4. Bloc 3 : Vue Kanban

### US-K1 (Must) Colonnes par statut
En tant qu'utilisateur, je veux voir mes tâches regroupées en colonnes par statut, afin d'avoir une vue d'ensemble du flux de travail.

- CA-K1.1 : Quatre colonnes : Brouillon, En cours, En édition, Terminé, dans cet ordre (maquette : DRAFT / IN PROGRESS / EDITING / DONE).
- CA-K1.2 : Chaque tâche apparaît dans la colonne correspondant à son statut, une seule fois.
- CA-K1.3 : Chaque carte affiche : titre, favori, progression, compteurs, sous-tâches (selon US-T4 à T7).
- CA-K1.4 : Une colonne vide affiche un état vide, sans erreur.
- CL : colonne avec beaucoup de cartes (défilement) ; carte au titre très long.

### US-K2 (Must) Déplacer une tâche entre colonnes
En tant qu'utilisateur, je veux déplacer une tâche d'une colonne à l'autre, afin de changer son statut simplement.

- CA-K2.1 : Une tâche peut être déplacée de n'importe quelle colonne vers n'importe quelle autre (pas de contrainte d'ordre). [AMB-09]
- CA-K2.2 : Après le déplacement, le statut de la tâche est mis à jour, y compris dans les autres vues et après rechargement.
- CA-K2.3 : Un déplacement annulé (lâcher hors d'une colonne) laisse la tâche à sa place d'origine.
- CA-K2.4 : Un moyen non glisser-déposer (bouton ou menu "changer de statut") existe pour le clavier et le tactile.
- CA-K2.5 : Déplacer vers Terminé applique la règle de CA-T3.3.
- Should : réordonner les cartes au sein d'une colonne et conserver l'ordre. [AMB-12]
- CL : déplacement pendant l'édition de la tâche ; double déplacement rapide ; déplacement vers la même colonne (aucun effet).

---

## 5. Bloc 4 : Planning

### US-P1 (Must) Vue Gantt / timeline
En tant qu'utilisateur, je veux voir mes tâches sous forme de barres sur une échelle de jours, afin de visualiser leur durée et leur chevauchement.

- CA-P1.1 : Une ligne par tâche ; la barre commence à la date de début et finit à la date de fin.
- CA-P1.2 : L'échelle de temps est exprimée en jours, avec les dates en en-tête (maquette : 28, 29, 30, 31, 01...).
- CA-P1.3 : La barre affiche la progression en % (partie foncée proportionnelle + valeur numérique) cohérente avec US-T4.
- CA-P1.4 : Toutes les tâches sont affichées, chacune ayant des dates obligatoires (AMB-06, tranché).
- CA-P1.5 : La fenêtre de dates visible peut être décalée (précédent / suivant / aujourd'hui) pour atteindre les tâches hors de la fenêtre initiale.
- CA-P1.6 : Le jour courant est repérable. (Should)
- [AMB-14] Le Gantt est-il en lecture seule ou permet-il d'ajuster dates/progression par glissement ? Hypothèse MVP : lecture seule, l'édition se fait via le formulaire de la tâche.
- CL : tâche d'un jour (barre minimale visible) ; tâche très longue dépassant la fenêtre (barre tronquée avec indication) ; beaucoup de tâches (défilement vertical) ; barre à 0 % et à 100 %.

### US-P2 (Must) Vue calendrier
En tant qu'utilisateur, je veux voir mes tâches et rappels dans un calendrier, afin de savoir ce qui est prévu chaque jour.

- CA-P2.1 : Vue mensuelle avec navigation mois précédent / suivant / aujourd'hui.
- CA-P2.2 : Les tâches apparaissent sur les jours couverts par leur période (début à fin).
- CA-P2.3 : Les rappels apparaissent au jour de leur échéance, y compris les occurrences récurrentes futures. [AMB-15] (le calendrier doit-il afficher les rappels, et les occurrences ?)
- CA-P2.4 : Un clic sur un jour ou un élément ouvre le détail ou le formulaire correspondant.
- Should : vue semaine. [AMB-15]
- CL : jour avec beaucoup d'éléments ("+ n autres") ; changement d'année ; mois à 28/29/30/31 jours.

### US-P3 (Must) Plan du jour
En tant qu'utilisateur, je veux planifier ma journée par créneaux horaires, afin de savoir quoi faire à quelle heure.

- CA-P3.1 : Le panneau affiche les créneaux du jour sous la forme "HH:MM - HH:MM" (ex. 12:00 - 13:00), triés par heure de début.
- CA-P3.2 : L'utilisateur peut ajouter, modifier et supprimer un créneau (titre, heure de début, heure de fin). [AMB-13]
- CA-P3.3 : L'heure de fin doit être postérieure à l'heure de début ; sinon erreur explicite.
- CA-P3.4 : Les créneaux d'un jour donné sont conservés après rechargement. Le panneau affiche le jour courant par défaut.
- [AMB-13] Un créneau est-il rattaché à une tâche (les pastilles A/B/C de la maquette) ou libre ? Hypothèse : un créneau peut référencer une tâche existante ou porter un titre libre. Peut-on planifier un autre jour que le jour courant ? Les créneaux se répètent-ils ?
- CL : créneaux qui se chevauchent (autoriser avec avertissement ? AMB-13) ; créneau traversant minuit (refusé en MVP, à confirmer) ; aucun créneau (état vide) ; tâche liée supprimée.

---

## 6. Bloc 5 : Tableau de bord

### US-D1 (Must) Anneaux d'efficacité
En tant qu'utilisateur, je veux voir des indicateurs d'efficacité sous forme d'anneaux de progression, afin d'évaluer d'un coup d'oeil mon avancement.

- CA-D1.1 (AMB-18, tranché) : Un anneau par tâche/projet, dont la valeur est la progression (%) de la tâche, de 0 à 100, avec le titre de la tâche en libellé.
- CA-D1.2 : Les valeurs reflètent les données réelles et se mettent à jour quand la progression d'une tâche change.
- CA-D1.3 : Sans tâche, un état vide s'affiche, sans erreur.
- CL : nombre d'anneaux variable (plafond d'affichage à définir par le designer, ex. 4 comme la maquette, avec accès au reste) ; tâche à 0 % ou 100 % ; libellé long tronqué.
- Note : la partie "auteurs" de la maquette (A/B/C/D) n'est pas reprise pour les anneaux ; elle reste ouverte pour l'histogramme (AMB-18, partie histogramme).

### US-D2 (Must) Histogramme des tâches terminées
En tant qu'utilisateur, je veux voir le nombre de tâches terminées dans un histogramme, afin de suivre ma productivité.

- CA-D2.1 : Les barres représentent un nombre de tâches terminées, avec une valeur numérique et un libellé par barre.
- CA-D2.2 : Passer une tâche à Terminé fait évoluer l'histogramme ; la repasser à un autre statut le fait diminuer.
- CA-D2.3 : Sans tâche terminée, un état vide s'affiche (pas de graphique cassé).
- **[AMB-18, histogramme : reste ouvert]** Axe et période : par jour, par semaine, par mois ? Hypothèse : par jour sur les 7 derniers jours (la maquette montre des "auteurs", non applicable). Il faudra aussi décider de la date retenue pour "terminée" (date de passage à Terminé : à enregistrer).
- CL : tâche terminée avant la période affichée ; tâche terminée puis rouverte ; changement de mois.

### US-D3 (Should) Panneau profil
En tant qu'utilisateur, je veux voir un en-tête personnel (nom, avatar), afin que l'application soit personnalisée comme dans la maquette.

- CA-D3.1 : Affichage d'un nom et d'un avatar par défaut. Édition du nom : à confirmer (AMB-19). Pas de compte ni de connexion.

---

## 7. Exigences transverses (Must)

- ET-1 Persistance : toutes les données (rappels, tâches, sous-tâches, créneaux) sont conservées après fermeture et réouverture du navigateur. Le mécanisme est choisi par l'architecte.
- ET-2 Cohérence : un changement fait dans une vue est visible dans toutes les autres sans rechargement.
- ET-3 Fuseau horaire : les heures sont interprétées et affichées dans le fuseau local de l'utilisateur.
- ET-4 Navigateurs : dernières versions de Chrome, Edge, Firefox, Safari (version bureau). Mobile : AMB-20.
- ET-5 Coût : aucune fonctionnalité du MVP ne doit imposer un service payant.
- ET-6 États : chaque liste/vue a un état vide, et les erreurs de validation sont affichées à côté du champ.
- ET-7 Langue : interface en français uniquement ; pas de sélecteur de langue (AMB-17).
- ET-8 Fidélité visuelle : écrans conformes à docs/reference/1.png (traité par le designer).

## 8. Récapitulatif des priorités

| Priorité | Stories |
|---|---|
| Must | US-R1, R2, R3, R4, R5 ; US-T1 à T7 ; US-K1, K2 ; US-P1, P2, P3 ; US-D1, D2 |
| Should | US-R6, US-T8, US-D3, réordonnancement des cartes (K2), vue semaine (P2), repère du jour courant (P1) |

## 9. Ambiguïtés à faire trancher par le client

| ID | Question | Hypothèse de travail |
|---|---|---|
| AMB-01 | **TRANCHÉ** : rappel lié à une tâche, oui, optionnel | CA-R1.6, CA-R1.7, CA-T2.4 |
| AMB-02 | **TRANCHÉ** : application ouverte suffisante, pas de notification onglet fermé ; manqués affichés à la réouverture | CA-R5.5 |
| AMB-03 | **TRANCHÉ** (aligné sur ARCHITECTURE.md) : occurrence en retard de plus de 5 min = manquée ; seule la plus récente est journalisée | CA-R5.6 |
| AMB-04 | Autorise-t-on un rappel avec date/heure dans le passé ? | Refusé à la création |
| AMB-05 | Récurrence : modifier/supprimer une occurrence ou toute la série ? Date de fin ? Plusieurs jours par semaine ? Mensuel le 31 ? | Série entière ; sans fin ; un seul jour ; dernier jour du mois |
| AMB-06 | **TRANCHÉ** : dates de début et de fin obligatoires ; toute tâche apparaît dans le Gantt | CA-T1.3, CA-P1.4 |
| AMB-07 | Règles entre statut, progression et sous-tâches (Terminé = 100 % ? progression calculée depuis les sous-tâches ?) | Progression manuelle ; Terminé force 100 % |
| AMB-08 | Commentaires et pièces jointes : l'utilisateur peut-il en ajouter ? Types, taille, stockage ? | Commentaires texte oui ; pièces jointes à décider |
| AMB-09 | Signification de "En édition" ; transitions libres entre statuts ? | Transitions libres |
| AMB-10 | Filtre/tri par favori, recherche : dans le MVP ? | Non (Should, après validation) |
| AMB-11 | Sous-tâches : un niveau seulement ? statut, progression, dates, "assigné" (A/B/C/D) propres ? | Un niveau, case à cocher seulement |
| AMB-12 | Ordre des cartes dans une colonne Kanban : à conserver ? | Should |
| AMB-13 | Plan du jour : créneaux libres ou liés à des tâches ? Autres jours que le jour courant ? Chevauchements ? Récurrence ? | Libres ou liés, jour courant, chevauchement avec avertissement |
| AMB-14 | Gantt interactif (glisser pour changer dates/progression) ou lecture seule ? | Lecture seule |
| AMB-15 | Calendrier : affiche-t-il rappels et tâches ? Vues mois seul ou mois+semaine+jour ? | Mois ; tâches et rappels |
| AMB-16 | Où vivent les rappels dans la navigation (écran dédié ?) ; que devient "Analytics" par rapport au "Dashboard" ? | Écran "Rappels" dédié ; Analytics fusionné au Dashboard |
| AMB-17 | Confirmer l'exclusion de Message, Global, Finance, Pricing, About, Language, Conditions et de la langue anglaise de la maquette. | Exclus, interface en français |
| AMB-18 | **TRANCHÉ pour les anneaux** : un anneau par tâche/projet = sa progression (CA-D1.1). **Reste ouvert pour l'histogramme** : axe et période, usage d'"auteurs" avec un seul utilisateur. | Histogramme : par jour sur 7 derniers jours (US-D2) |
| AMB-19 | Le profil (nom, avatar) est-il éditable ? | Nom éditable, avatar par défaut |
| AMB-20 | Usage mobile / responsive attendu ? Usage sur plusieurs appareils (données non synchronisées sans serveur) ? Export/sauvegarde des données ? | Bureau d'abord ; un seul appareil ; pas d'export |
