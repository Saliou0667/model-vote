# STATUS.md - Suivi d'avancement du projet

**Derniere mise a jour :** 2026-02-07

---

## Etat global

| Milestone                      | Statut       | Progression | Notes                              |
| ------------------------------ | ------------ | ----------- | ---------------------------------- |
| M0 - Squelette & Base UI       | Termine      | 100%        | DoD M0 validee                     |
| M1 - Sections & Membres        | Termine      | 100%        | Backend + UI CRUD + validations OK |
| M2 - Cotisations               | En cours     | 0%          | Prochaine etape                    |
| M3 - Eligibilite               | Non commence | 0%          | Depend de M2                       |
| M4 - Elections & Candidats     | Non commence | 0%          | Depend de M3                       |
| M5 - Vote + Confidentialite    | Non commence | 0%          | Depend de M4                       |
| M6 - Resultats, Exports, Audit | Non commence | 0%          | Depend de M5                       |

**Progression globale : 31%**

---

## Detail M1

| Tache                                                | Statut |
| ---------------------------------------------------- | ------ |
| Cloud Function `ensureMemberProfile`                 | OK     |
| Cloud Function `createSection`                       | OK     |
| Cloud Function `updateSection`                       | OK     |
| Cloud Function `deleteSection` (superadmin only)     | OK     |
| Cloud Function `createMember`                        | OK     |
| Cloud Function `updateMember` (self/admin scope)     | OK     |
| Audit logs M1 (`member.*`, `section.*`)              | OK     |
| Page admin Sections (creation, edition, suppression) | OK     |
| Page admin Membres (creation, filtres, edition)      | OK     |
| Page membre Mon profil (mise a jour via function)    | OK     |
| Validation `pnpm format:check`                       | OK     |
| Validation `pnpm lint`                               | OK     |
| Validation `pnpm test`                               | OK     |
| Validation `pnpm typecheck`                          | OK     |
| Validation `pnpm build`                              | OK     |

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
