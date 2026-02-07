# STATUS.md - Suivi d'avancement du projet

**Derniere mise a jour :** 2026-02-07

---

## Etat global

| Milestone                      | Statut       | Progression | Notes           |
| ------------------------------ | ------------ | ----------- | --------------- |
| M0 - Squelette & Base UI       | Termine      | 100%        | DoD M0 validee  |
| M1 - Sections & Membres        | En attente   | 0%          | Prochaine etape |
| M2 - Cotisations               | Non commence | 0%          | Depend de M1    |
| M3 - Eligibilite               | Non commence | 0%          | Depend de M2    |
| M4 - Elections & Candidats     | Non commence | 0%          | Depend de M3    |
| M5 - Vote + Confidentialite    | Non commence | 0%          | Depend de M4    |
| M6 - Resultats, Exports, Audit | Non commence | 0%          | Depend de M5    |

**Progression globale : 16%**

---

## Detail M0

| Tache                                            | Statut |
| ------------------------------------------------ | ------ |
| Monorepo pnpm (`apps/web`, `functions`)          | OK     |
| Firebase local (`firebase.json`, rules, indexes) | OK     |
| Scripts racine (`dev`, `build`, `deploy`)        | OK     |
| Auth email/password + verification email         | OK     |
| Guards de routes par role                        | OK     |
| Layouts `MemberLayout` / `AdminLayout`           | OK     |
| Pages placeholder membre/admin/superadmin        | OK     |
| Cloud Functions bootstrap role + change role     | OK     |
| ESLint configure                                 | OK     |
| Prettier configure                               | OK     |
| Vitest configure + test smoke                    | OK     |
| Validation `pnpm build`                          | OK     |
| Validation `pnpm lint`                           | OK     |
| Validation `pnpm test`                           | OK     |
| Validation `pnpm typecheck`                      | OK     |

---

## Journal des changements

| Date       | Action                                                                 |
| ---------- | ---------------------------------------------------------------------- |
| 2026-02-07 | Initialisation monorepo + setup Firebase local                         |
| 2026-02-07 | Mise en place auth, layouts, routing protege et pages placeholder      |
| 2026-02-07 | Ajout Cloud Functions `bootstrapRole` et `changeRole`                  |
| 2026-02-07 | Ajout Prettier + Vitest (test smoke) + nettoyage README et checkpoint  |
| 2026-02-07 | M0 valide : `build/lint/test/typecheck/format` OK + `pnpm dev` verifie |
