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

- Milestone en cours: `M2`
- Derniere etape terminee:
  - M1 backend: `ensureMemberProfile`, `create/update/deleteSection`, `create/updateMember`
  - M1 frontend: pages Sections, Membres, Mon profil avec appels callable
  - validations OK: `pnpm format:check`, `pnpm lint`, `pnpm test`, `pnpm typecheck`, `pnpm build`
- Prochaine etape immediate:
  - demarrer M2 (cotisations: politiques + paiements + statut a jour/en retard)

---

## 3) Taches immediates (ordre de reprise)

1. Ajouter les fonctions M2: `setContributionPolicy`, `recordPayment`.
2. Ajouter la logique de calcul statut cotisation pour affichage membres.
3. Implementer l'ecran admin Cotisations + integration fiche membre.
4. Relancer validation complete et commit M2.

---

## 4) Blocages connus

- Aucun blocage actif.

---

## 5) Regle de mise a jour

Ce fichier doit etre mis a jour:

- en fin de session
- a chaque changement de milestone
- des qu'un blocage apparait/disparait
