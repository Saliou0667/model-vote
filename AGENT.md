# AGENT.md — Règles de travail pour l'agent IA

> Ce fichier est le contrat de travail de l'agent. Il DOIT être lu en premier avant toute action.

---

## 1. Lecture obligatoire

Avant de coder quoi que ce soit, lire **tous** les fichiers dans `/docs` :

- `docs/PRD.md` — Objectifs produit, périmètre MVP, rôles
- `docs/DATA_MODEL.md` — Collections Firestore, champs, index, intégrité
- `docs/RBAC_SECURITY.md` — Permissions par rôle, séparation données, audit
- `docs/UX_UI.md` — Design system, navigation, composants, responsive
- `docs/FUNCTIONS_API.md` — Cloud Functions (nom, input, output, erreurs)
- `docs/ACCEPTANCE.md` — Critères d'acceptation testables
- `docs/TEST_PLAN.md` — Stratégie de tests, jeux de données
- `docs/DEPLOYMENT.md` — Déploiement Firebase, variables d'environnement
- `docs/MILESTONES.md` — Découpage en milestones M0→M6
- `docs/DECISIONS_LOCK.md` — Décisions figées (produit/sécurité)
- `docs/BOOTSTRAP.md` — Bootstrap du premier SuperAdmin
- `docs/ENVIRONMENTS.md` — Contrat dev/staging/prod
- `docs/CICD_CONTRACT.md` — Checks CI/CD bloquants
- `docs/BRANDING.md` — Branding officiel MODEL
- `docs/SEED_DATA.md` — Données de seed officielles

Consulter `progress/CHECKPOINT.md`, `progress/RECOVERY_PROTOCOL.md` et `progress/STATUS.md` pour reprendre exactement l'etat courant.

---

## 2. Règles techniques NON NÉGOCIABLES

### Sécurité du vote

- **JAMAIS** écrire directement dans la collection `ballots` depuis le client
- **TOUTES** les actions sensibles passent par des **Cloud Functions** :
  - `castVote`, `openElection`, `closeElection`, `recordPayment`, `publishResults`, etc.
- La collection `tokenIndex` (lien membre ↔ jeton) est **inaccessible** sauf SuperAdmin via fonction audit

### Écritures backend only (principe)

- Les écritures client directes sont interdites sur les collections métier :
  - `members`, `sections`, `conditions`, `memberConditions`, `contributionPolicies`,
    `payments`, `elections`, `candidates`, `results`, `auditLogs`
- Le client passe par les Cloud Functions pour toute mutation métier.

### Intégrité des données

- Les paiements sont **append-only** (jamais de suppression ni modification)
- Les logs d'audit sont **append-only**
- Aucune donnée sensible (mots de passe, jetons) dans les logs

### Séparation des données

- Données membres (`members/`) ≠ Urne (`ballots/`) — jamais de jointure directe côté client
- Le lien membre ↔ vote est stocké dans `tokenIndex/` accessible uniquement en audit

---

## 3. Architecture & Stack

```
Monorepo:  pnpm workspaces
Frontend:  React 18 + TypeScript (Vite) dans apps/web
UI:        Material UI (MUI) v5+
Routage:   React Router v6
Formulaires: React Hook Form + Zod
Requêtes:  TanStack Query (React Query)
Backend:   Firebase Auth + Firestore + Cloud Functions (Node.js/TS) dans functions
Tests:     Vitest (unitaires) + Playwright (E2E)
Dev:       Firebase Emulator Suite
```

---

## 4. Conventions de code

- TypeScript strict (`strict: true`), **zéro erreur TS**
- ESLint + Prettier activés, **zéro warning**
- Nommage :
  - Composants : `PascalCase` (fichiers et exports)
  - Hooks : `useCamelCase`
  - Utils/helpers : `camelCase`
  - Collections Firestore : `camelCase` (ex: `members`, `elections`, `ballots`)
  - Cloud Functions : `camelCase` (ex: `castVote`, `closeElection`)
- Un composant par fichier
- Pas de `any` — typer explicitement

---

## 5. Qualité UI obligatoire

Chaque écran/composant DOIT gérer :

- **Loading state** : skeleton ou spinner
- **Error state** : message lisible + action (retry, contact admin)
- **Empty state** : message + CTA si applicable
- **Responsive** : mobile-first, fonctionnel sur desktop et téléphone
- **Accessibilité** : labels, aria, contraste suffisant

---

## 6. Definition of Done (DoD)

Avant de considérer un milestone terminé :

- [ ] TypeScript compile sans erreur
- [ ] Lint/format OK (0 warning)
- [ ] Tests unitaires passent (éligibilité, cotisations, règles vote)
- [ ] Tests E2E Playwright passent (flux critiques)
- [ ] Firebase Emulators utilisés en dev/test
- [ ] `pnpm dev` démarre correctement `apps/web` + emulators
- [ ] Logs d'audit enregistrés pour toute action sensible
- [ ] Aucune donnée sensible dans les logs
- [ ] Règles Firestore empêchent lecture/écriture non autorisées
- [ ] UI responsive (mobile + desktop)
- [ ] `progress/STATUS.md` mis à jour

---

## 7. Workflow par milestone

1. Lire le milestone concerné dans `docs/MILESTONES.md`
2. Vérifier les dépendances (milestones précédents terminés ?)
3. Implémenter : composants + fonctions + règles + tests
4. Valider la DoD
5. Mettre à jour `progress/STATUS.md`
6. Passer au milestone suivant

---

## 7.bis Protocole de reprise (obligatoire)

Au debut de chaque session:

1. Lire `progress/CHECKPOINT.md`
2. Lire `progress/RECOVERY_PROTOCOL.md`
3. Reprendre la premiere tache "Taches immediates"

A la fin de chaque session:

1. Mettre a jour `progress/CHECKPOINT.md` (etat, prochaine action, blocages)
2. Mettre a jour `progress/STATUS.md` (journal + progression)

---

## 8. Structure cible du projet (après M0)

```
model-vote/
├── AGENT.md                    # Ce fichier (règles de travail)
├── apps/
│   └── web/                    # Frontend React (Vite + TS + MUI)
├── docs/                       # Spécifications contractuelles
│   ├── PRD.md
│   ├── DATA_MODEL.md
│   ├── RBAC_SECURITY.md
│   ├── UX_UI.md
│   ├── FUNCTIONS_API.md
│   ├── ACCEPTANCE.md
│   ├── TEST_PLAN.md
│   ├── DEPLOYMENT.md
│   └── MILESTONES.md
├── progress/                   # Suivi d'avancement
│   ├── CHECKPOINT.md           # Point de reprise anti-interruption
│   ├── RECOVERY_PROTOCOL.md    # Procedure de reprise session
│   └── STATUS.md
├── functions/                  # Cloud Functions Firebase
│   └── src/
├── firestore.rules             # Règles de sécurité Firestore
├── firestore.indexes.json      # Index Firestore
├── firebase.json
├── .firebaserc
├── package.json
└── ...
```

> Note: l'état actuel peut être "documentation only" avant l'initialisation technique de M0.

---

## 9. Interdictions

- ❌ Ne pas inventer de fonctionnalités hors périmètre MVP
- ❌ Ne pas utiliser de "quick hacks" (TODO, console.log en prod, any)
- ❌ Ne pas écrire dans `ballots` ou `tokenIndex` depuis le client
- ❌ Ne pas exposer les votes individuels aux rôles Admin ou Membre
- ❌ Ne pas supprimer de données de paiement ou de logs
- ❌ Ne pas déployer sans avoir validé la DoD
