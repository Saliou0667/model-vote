# ACCEPTANCE.md — Critères d'acceptation testables

**Version :** 1.0 (MVP)
**Dernière mise à jour :** 2026-02-07

> Chaque critère est formulé de manière **testable** (résultat attendu vérifiable).

---

## A) Authentification & Inscription

| #   | Critère                                                        | Résultat attendu                             |
| --- | -------------------------------------------------------------- | -------------------------------------------- |
| A1  | Un visiteur peut créer un compte avec email + mot de passe     | Compte créé, email de vérification envoyé    |
| A2  | Un utilisateur non vérifié ne peut pas accéder à l'application | Redirection vers page "vérifiez votre email" |
| A3  | Un utilisateur vérifié accède à son espace membre              | Dashboard membre affiché                     |
| A4  | Un mot de passe faible (< 8 car.) est rejeté                   | Message d'erreur inline                      |
| A5  | Un email déjà utilisé est rejeté à l'inscription               | Message "email déjà utilisé"                 |
| A6  | Après inscription, le profil est marqué `status: "pending"`    | Statut visible dans la fiche                 |
| A7  | Un admin peut passer un membre de `pending` à `active`         | Statut mis à jour + log                      |

---

## B) Gestion des sections

| #   | Critère                                        | Résultat attendu                                          |
| --- | ---------------------------------------------- | --------------------------------------------------------- |
| B1  | Un admin peut créer une section (nom, ville)   | Section créée, visible dans la liste                      |
| B2  | Un admin peut modifier une section             | Modification enregistrée                                  |
| B3  | Seul un SuperAdmin peut supprimer une section  | Admin reçoit une erreur, SuperAdmin peut supprimer        |
| B4  | La liste des sections est triable par nom      | Tri fonctionnel                                           |
| B5  | Le compteur de membres par section est correct | Mise à jour après ajout/suppression de membres            |
| B6  | Les actions section sont loggées               | Logs `section.create`, `section.update`, `section.delete` |

---

## C) Gestion des membres

| #   | Critère                                                | Résultat attendu                              |
| --- | ------------------------------------------------------ | --------------------------------------------- |
| C1  | Un admin voit la liste de tous les membres             | Table avec nom, email, section, statut        |
| C2  | La recherche par nom/email fonctionne                  | Résultats filtrés en temps réel               |
| C3  | Le filtre par section fonctionne                       | Seuls les membres de la section sont affichés |
| C4  | Le filtre par statut fonctionne                        | Seuls les membres du statut choisi            |
| C5  | Un admin peut accéder à la fiche détaillée d'un membre | Profil + conditions + paiements + historique  |
| C6  | Seul un SuperAdmin peut changer le rôle d'un membre    | Admin reçoit une erreur                       |
| C7  | Le changement de rôle est loggé                        | Log avec ancien et nouveau rôle               |

---

## D) Conditions d'éligibilité

| #   | Critère                                                   | Résultat attendu                                         |
| --- | --------------------------------------------------------- | -------------------------------------------------------- |
| D1  | Un SuperAdmin peut créer une condition (nom, type, durée) | Condition créée, visible dans le catalogue               |
| D2  | Un admin peut valider une condition pour un membre        | `memberConditions/` mis à jour, log créé                 |
| D3  | Un admin peut invalider une condition                     | `validated: false`, log créé                             |
| D4  | L'historique de validation est visible                    | Qui a validé, quand, note                                |
| D5  | Une condition avec durée expire automatiquement           | `expiresAt` calculé, condition invalide après expiration |
| D6  | Un membre voit sa checklist dans "Mon éligibilité"        | Conditions avec statut (✅/⏳/❌)                        |
| D7  | Un membre non éligible voit les raisons                   | Liste des conditions non remplies                        |

---

## E) Cotisations

| #   | Critère                                                                      | Résultat attendu                                  |
| --- | ---------------------------------------------------------------------------- | ------------------------------------------------- |
| E1  | Un SuperAdmin peut configurer la politique (montant, périodicité, tolérance) | Politique créée/mise à jour + log                 |
| E2  | Un admin peut enregistrer un paiement                                        | Document `payments/` créé + log                   |
| E3  | Un paiement ne peut pas être supprimé                                        | Aucun bouton supprimer, Firestore rules bloquent  |
| E4  | Un paiement ne peut pas être modifié                                         | Aucun bouton modifier, Firestore rules bloquent   |
| E5  | Le statut "à jour" est calculé correctement                                  | Basé sur dernier paiement + politique + tolérance |
| E6  | Un membre en retard est marqué "en retard"                                   | Badge rouge + date de retard                      |
| E7  | L'historique des paiements est affiché par date DESC                         | Table triée                                       |
| E8  | La modification de politique est loggée                                      | Log `policy.update` + `policy.create`             |

---

## F) Élections

| #   | Critère                                                    | Résultat attendu                              |
| --- | ---------------------------------------------------------- | --------------------------------------------- |
| F1  | Un admin peut créer une élection via le wizard             | Élection en statut `draft`                    |
| F2  | Les dates sont validées (clôture > ouverture > maintenant) | Erreur si dates invalides                     |
| F3  | Un admin peut sélectionner les conditions requises         | Multi-select depuis le catalogue              |
| F4  | Un admin peut ouvrir l'élection                            | Statut → `open`, candidats/règles verrouillés |
| F5  | L'ouverture requiert au moins 2 candidats validés          | Erreur si < 2 candidats                       |
| F6  | Après ouverture, un admin ne peut plus modifier l'élection | Erreur `ERROR_ELECTION_LOCKED`                |
| F7  | Après ouverture, un SuperAdmin peut modifier (avec log)    | Modification OK + log                         |
| F8  | L'élection se ferme automatiquement après `endAt`          | Statut → `closed` via scheduled function      |
| F9  | Un admin peut fermer manuellement l'élection               | Statut → `closed` + log                       |

---

## G) Candidats

| #   | Critère                                              | Résultat attendu                     |
| --- | ---------------------------------------------------- | ------------------------------------ |
| G1  | Un admin peut proposer un candidat (membre existant) | Candidat créé avec statut `proposed` |
| G2  | Le système vérifie l'éligibilité candidat            | Erreur si conditions non remplies    |
| G3  | Un admin peut valider ou rejeter un candidat         | Statut mis à jour + log              |
| G4  | L'ordre d'affichage est randomisé à l'ouverture      | `displayOrder` aléatoire             |
| G5  | Les candidats sont affichés sous forme de cartes     | Photo, nom, section, bio             |

---

## H) Vote — Confidentialité & Anti-triche

| #   | Critère                                                   | Résultat attendu                                                          |
| --- | --------------------------------------------------------- | ------------------------------------------------------------------------- |
| H1  | Un membre éligible peut voter                             | Bouton "Voter" visible                                                    |
| H2  | Un membre non éligible ne peut PAS voter                  | Bouton absent + message explicatif                                        |
| H3  | Le vote passe par Cloud Function uniquement               | Aucune écriture client dans `ballots/`                                    |
| H4  | Après `endAt`, `castVote` renvoie `ERROR_ELECTION_CLOSED` | Erreur retournée                                                          |
| H5  | Un membre ne peut voter qu'une seule fois                 | `ERROR_ALREADY_VOTED` au 2ème essai                                       |
| H6  | Le bulletin ne contient PAS le `memberId`                 | Vérifié dans `ballots/` : uniquement `voteToken`, `candidateId`, `castAt` |
| H7  | Le log `vote.cast` ne contient PAS le `candidateId`       | Vérifié dans `auditLogs/`                                                 |
| H8  | Un admin ne peut PAS lire `ballots/`                      | Firestore rules bloquent                                                  |
| H9  | Un admin ne peut PAS lire `tokenIndex/`                   | Firestore rules bloquent                                                  |
| H10 | Le compteur `totalVotesCast` est incrémenté atomiquement  | Pas de race condition                                                     |
| H11 | Un membre voit "Votre vote est enregistré" après vote     | Page de confirmation                                                      |
| H12 | La modal de confirmation est affichée avant vote          | "Vous allez voter pour [X]. Confirmer ?"                                  |

---

## I) Résultats

| #   | Critère                                                              | Résultat attendu                             |
| --- | -------------------------------------------------------------------- | -------------------------------------------- |
| I1  | Les résultats sont calculés après clôture                            | Documents `results/` créés                   |
| I2  | Les résultats sont visibles aux membres uniquement après publication | Erreur ou page vide si pas publié            |
| I3  | Les résultats affichent : candidat, votes, %, classement             | Données correctes                            |
| I4  | Le taux de participation est affiché                                 | `totalVotesCast / totalEligibleVoters * 100` |
| I5  | Un admin peut exporter en CSV                                        | Fichier CSV téléchargé                       |
| I6  | Un admin peut exporter en PDF                                        | Fichier PDF téléchargé                       |

---

## J) Audit (SuperAdmin)

| #   | Critère                                          | Résultat attendu                                                  |
| --- | ------------------------------------------------ | ----------------------------------------------------------------- |
| J1  | Seul un SuperAdmin peut accéder à l'audit        | Admin reçoit une erreur                                           |
| J2  | Le motif est obligatoire pour toute action audit | Erreur si motif vide                                              |
| J3  | `auditCheckVoter` retourne si un membre a voté   | `hasVoted: true/false`                                            |
| J4  | `auditRevealVote` retourne le choix du membre    | `candidateId` retourné                                            |
| J5  | Chaque action audit est loggée                   | `auditLogs/` avec action `audit.access`                           |
| J6  | Le log contient la raison de l'audit             | `details.reason` renseigné                                        |
| J7  | Un admin ne peut PAS voir les logs d'audit       | Filtrage appliqué dans `getAuditLogs` (actions `audit.*` exclues) |

---

## K) Logs & Traçabilité

| #   | Critère                                            | Résultat attendu                                                                   |
| --- | -------------------------------------------------- | ---------------------------------------------------------------------------------- |
| K1  | Toute modification de paiement est loggée          | `payment.record` dans `auditLogs/`                                                 |
| K2  | Toute modification de politique est loggée         | `policy.create` / `policy.update`                                                  |
| K3  | Toute modification d'élection est loggée           | `election.*`                                                                       |
| K4  | Les logs ne contiennent pas de données sensibles   | Pas de mot de passe, pas de `candidateId` dans `vote.cast`                         |
| K5  | Les logs sont filtrables par action, acteur, date  | Filtres fonctionnels                                                               |
| K6  | Les logs ne peuvent pas être supprimés             | Firestore rules bloquent                                                           |
| K7  | Les écritures métier directes client sont bloquées | `members/sections/elections/...` en write direct refusé (Cloud Functions requises) |

---

## L) UI / UX

| #   | Critère                                                     | Résultat attendu                         |
| --- | ----------------------------------------------------------- | ---------------------------------------- |
| L1  | L'app est utilisable sur mobile (320px+)                    | Mise en page adaptée, pas de débordement |
| L2  | Les tables ont recherche, filtres, pagination               | Composants fonctionnels                  |
| L3  | Les états de chargement affichent des skeletons             | Pas d'écran blanc pendant le chargement  |
| L4  | Les erreurs affichent un message lisible                    | Snackbar ou alerte inline                |
| L5  | Les états vides affichent un message + CTA                  | "Aucun résultat" + action                |
| L6  | Les actions destructives demandent confirmation             | Modal de confirmation                    |
| L7  | Le wizard de création d'élection fonctionne étape par étape | 4 étapes navigables                      |

---

## T) Initialisation technique (M0)

| #   | Critère                                              | Résultat attendu                                                |
| --- | ---------------------------------------------------- | --------------------------------------------------------------- |
| T1  | `pnpm dev` lance l'app web et les Firebase emulators | Frontend accessible + emulators Auth/Firestore/Functions actifs |
| T2  | La structure monorepo est en place                   | Dossiers `apps/web` et `functions` présents                     |
| T3  | Le branding MODEL est visible sur l'app              | Nom/identité MODEL affichés sur auth + shell applicatif         |
