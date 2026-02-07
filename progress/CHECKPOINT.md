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

- Milestone en cours: `M1`
- Derniere etape terminee:
  - monorepo `apps/web + functions` initialise
  - scripts racine `dev/build/lint/test/typecheck/deploy` en place
  - AuthContext + routes protegees + layouts membre/admin
  - Cloud Functions `bootstrapRole` et `changeRole` implementees
  - Firestore rules verrouillees (ecritures metier client refusees)
  - validation locale OK: `pnpm format:check`, `pnpm build`, `pnpm lint`, `pnpm test`, `pnpm typecheck`
  - `pnpm dev` verifie (web + emulateurs Auth/Firestore/Functions)
- Prochaine etape immediate:
  - demarrer M1 (sections + membres)

---

## 3) Taches immediates (ordre de reprise)

1. Implementer M1 backend: Cloud Functions `createSection`, `updateSection`, `deleteSection`, `createMember`, `updateMember`.
2. Implementer M1 frontend: pages admin `Sections` et `Membres` avec formulaires et listing.
3. Ajouter tests unitaires/integration M1 sur emulateurs.
4. Mettre a jour `progress/STATUS.md` avec la progression M1.

---

## 4) Blocages connus

- Aucun blocage actif.

---

## 5) Regle de mise a jour

Ce fichier doit etre mis a jour:

- en fin de session
- a chaque changement de milestone
- des qu'un blocage apparait/disparait
