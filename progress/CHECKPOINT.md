# CHECKPOINT.md - Point de reprise operationnel

**Derniere mise a jour:** 2026-02-07  
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

- Milestone en cours: `M4`
- Derniere etape terminee:
  - M3 backend: `create/updateCondition`, `validateCondition`, `computeEligibility`
  - M3 frontend: page Conditions admin + page Mon eligibilite membre
  - validations OK: `pnpm format:check`, `pnpm lint`, `pnpm test`, `pnpm typecheck`, `pnpm build`
- Prochaine etape immediate:
  - demarrer M4 (elections + candidats + cycle de vie)

---

## 3) Taches immediates (ordre de reprise)

1. Ajouter les fonctions M4: `createElection`, `updateElection`, `openElection`, `closeElection`, `addCandidate`, `validateCandidate`, `removeCandidate`.
2. Ajouter les ecrans M4: gestion elections + candidats.
3. Integrer verrouillage post-ouverture et controles d'eligibilite candidat.
4. Relancer validation complete et commit M4.

---

## 4) Blocages connus

- Aucun blocage actif.

---

## 5) Regle de mise a jour

Ce fichier doit etre mis a jour:

- en fin de session
- a chaque changement de milestone
- des qu'un blocage apparait/disparait
