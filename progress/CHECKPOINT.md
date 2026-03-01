# CHECKPOINT.md - Point de reprise operationnel

**Derniere mise a jour:** 2026-03-01  
**Etat de reprise:** READY

---

## 1) Contexte courant

- Projet Firebase: `model-vote-fr-2026`
- Firestore `(default)`: actif
- Firebase App Web: `1:910940683123:web:bc3d3392e90b700b3c2306`
- Timezone metier: `Europe/Paris`
- SuperAdmin bootstrap autorise: `emrysdiallo@gmail.com`

---

## 2) Avancement

- Milestone en cours: `Done`
- Derniere etape terminee:
  - M6 backend: resultats/exports/logs/audit
  - M6 frontend: resultats membre, logs admin, gestion admins, audit superadmin
  - hardening: Playwright smoke + workflow CI GitHub
  - fusion Belgique: poste "Secretaire au sport" + "Secretaire a la securite" fusionne dans l'import, la lecture web et la prod
  - front membre: menu "Scores" masque tant qu'aucun resultat n'est publie pour la federation
  - front membre Belgique: l'ecran "Scores" republie utilise a nouveau l'UI riche avec photos/cartes une fois les resultats publies
  - vote/resultats: un seul libelle "Bulletin blanc", option de vote blanc ajoutee, carte "Bulletin blanc" restauree dans les scores/resultats
  - scores/resultats: les pourcentages candidat et bulletin blanc sont calcules sur le total des bulletins
  - Belgique prod: reset complet des donnees de vote/elections, scrutins remis en `draft` avec ouverture planifiee au `2026-03-01 08:00:00 +01:00` et fermeture au `2026-03-01 22:00:00 +01:00`
  - Belgique prod: scheduler Functions deploye pour ouvrir/fermer automatiquement les scrutins belges sans toucher a la France
  - validations recentes OK: `pnpm typecheck`, `pnpm build`, `firebase deploy --project model-vote-fr-2026 --only functions`, `node functions/scripts/reset-belgique-elections.cjs`
- Prochaine etape immediate:
  - optionnel: tests functions avec couverture cible + optimisation bundle frontend

---

## 3) Taches immediates (ordre de reprise)

1. Ajouter tests unitaires Functions (eligibilite, castVote, publishResults).
2. Ajouter tests integration Firebase Emulators cote functions.
3. Optimiser bundle web (split chunks routes/pages).
4. Ajouter seuils de coverage dans CI (functions 80%, web 60%+).

---

## 4) Blocages connus

- Aucun blocage actif.

---

## 5) Regle de mise a jour

Ce fichier doit etre mis a jour:

- en fin de session
- a chaque changement de milestone
- des qu'un blocage apparait/disparait
