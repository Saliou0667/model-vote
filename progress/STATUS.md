# STATUS.md - Suivi d'avancement du projet

**Derniere mise a jour :** 2026-03-01

---

## Etat global

| Milestone                      | Statut  | Progression | Notes                                |
| ------------------------------ | ------- | ----------- | ------------------------------------ |
| M0 - Squelette & Base UI       | Termine | 100%        | DoD M0 validee                       |
| M1 - Sections & Membres        | Termine | 100%        | Backend + UI CRUD + validations OK   |
| M2 - Cotisations               | Termine | 100%        | Policy/paiements + UI + logs OK      |
| M3 - Eligibilite               | Termine | 100%        | Conditions + validation + calcul OK  |
| M4 - Elections & Candidats     | Termine | 100%        | Cycle election + UI candidats OK     |
| M5 - Vote + Confidentialite    | Termine | 100%        | castVote transactionnel + UI vote OK |
| M6 - Resultats, Exports, Audit | Termine | 100%        | resultats/logs/audit/roles livres    |

**Progression globale : 100%**

---

## Detail M6

| Tache                                                 | Statut |
| ----------------------------------------------------- | ------ |
| Cloud Function `publishResults`                       | OK     |
| Cloud Function `getResults`                           | OK     |
| Cloud Function `exportResults`                        | OK     |
| Cloud Function `getAuditLogs`                         | OK     |
| Cloud Function `auditCheckVoter`                      | OK     |
| Cloud Function `auditRevealVote`                      | OK     |
| Ecran membre Resultats                                | OK     |
| Ecran admin Logs                                      | OK     |
| Ecran superadmin Gestion admins                       | OK     |
| Ecran superadmin Audit                                | OK     |
| Publication + export resultats depuis ecran Elections | OK     |
| Validation `pnpm format:check`                        | OK     |
| Validation `pnpm lint`                                | OK     |
| Validation `pnpm test`                                | OK     |
| Validation `pnpm typecheck`                           | OK     |
| Validation `pnpm build`                               | OK     |

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
| 2026-02-07 | M4 livre : elections/candidats + ouverture/fermeture + UI + tests      |
| 2026-02-07 | M5 livre : vote confidentiel transactionnel + UI membre + tests        |
| 2026-02-07 | M6 livre : resultats + exports + logs + audit + gestion roles          |
| 2026-02-07 | Hardening livre : Playwright smoke + CI GitHub bloquante               |
| 2026-02-28 | Belgique: fusion du poste secretaire sport + securite, migration prod et redeploiement |
| 2026-03-01 | Front membre: menu Scores masque tant que les resultats ne sont pas publies |
| 2026-03-01 | Front membre: l'ecran Scores restaure l'UI riche (photos/cartes) des que les resultats sont publies |
| 2026-03-01 | Vote/resultats: "Bulletin blanc" unifie, option de vote blanc ajoutee, carte restauree dans les scores et pourcentages calcules sur le total des bulletins |
| 2026-03-01 | Belgique prod: reset des scrutins/tests, remise en draft, fenetre 08:00-22:00 Europe/Paris et scheduler automatique Belgique deploye |
