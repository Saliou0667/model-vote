# STATUS.md - Suivi d'avancement du projet

**Derniere mise a jour :** 2026-02-07

---

## Etat global

| Milestone                      | Statut       | Progression | Notes                               |
| ------------------------------ | ------------ | ----------- | ----------------------------------- |
| M0 - Squelette & Base UI       | Termine      | 100%        | DoD M0 validee                      |
| M1 - Sections & Membres        | Termine      | 100%        | Backend + UI CRUD + validations OK  |
| M2 - Cotisations               | Termine      | 100%        | Policy/paiements + UI + logs OK     |
| M3 - Eligibilite               | Termine      | 100%        | Conditions + validation + calcul OK |
| M4 - Elections & Candidats     | En cours     | 0%          | Prochaine etape                     |
| M5 - Vote + Confidentialite    | Non commence | 0%          | Depend de M4                        |
| M6 - Resultats, Exports, Audit | Non commence | 0%          | Depend de M5                        |

**Progression globale : 60%**

---

## Detail M3

| Tache                                                      | Statut |
| ---------------------------------------------------------- | ------ |
| Cloud Function `createCondition`                           | OK     |
| Cloud Function `updateCondition`                           | OK     |
| Cloud Function `validateCondition`                         | OK     |
| Cloud Function `computeEligibility`                        | OK     |
| Ecran admin Conditions (catalogue + activation)            | OK     |
| Validation de conditions par membre                        | OK     |
| Ecran membre Mon eligibilite (reasons detaillees)          | OK     |
| Route admin `/admin/conditions` + navigation               | OK     |
| Index Firestore memberConditions (`memberId`, `updatedAt`) | OK     |
| Validation `pnpm format:check`                             | OK     |
| Validation `pnpm lint`                                     | OK     |
| Validation `pnpm test`                                     | OK     |
| Validation `pnpm typecheck`                                | OK     |
| Validation `pnpm build`                                    | OK     |

---

## Journal des changements

| Date       | Action                                                                 |
| ---------- | ---------------------------------------------------------------------- |
| 2026-02-07 | Initialisation monorepo + setup Firebase local                         |
| 2026-02-07 | Mise en place auth, layouts, routing protege et pages placeholder      |
| 2026-02-07 | Ajout Cloud Functions `bootstrapRole` et `changeRole`                  |
| 2026-02-07 | Ajout Prettier + Vitest (test smoke) + nettoyage README et checkpoint  |
| 2026-02-07 | M0 valide : `build/lint/test/typecheck/format` OK + `pnpm dev` verifie |
| 2026-02-07 | M1 livre : fonctions sections/membres + UI admin/membre + tests OK     |
| 2026-02-07 | M2 livre : politique cotisations + paiements append-only + UI + tests  |
| 2026-02-07 | M3 livre : conditions + validation + calcul eligibilite + UI + tests   |
