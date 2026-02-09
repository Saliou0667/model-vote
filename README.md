# model-vote

Application de vote interne du `MODEL` (Mouvement Democratique Liberal), basee sur React + Firebase.

## Etat du projet

- Milestones `M0 -> M6` livres
- Frontend web (React + MUI) + Firebase Functions (RBAC, election, vote, audit)
- Auth email/password + routing protege par role
- Firebase Emulator Suite + pipeline CI (lint/typecheck/tests/build/e2e smoke)

## Structure

```text
model-vote/
  apps/
    web/                # Frontend React (Vite + TypeScript + MUI)
  functions/            # Cloud Functions Firebase (TypeScript)
  docs/                 # Specifications contractuelles
  progress/             # Suivi et reprise apres interruption
  firebase.json
  firestore.rules
  firestore.indexes.json
  package.json
```

## Commandes utiles

```bash
pnpm install
pnpm seed:emulator
pnpm dev
pnpm build
pnpm lint
pnpm test
pnpm e2e
pnpm typecheck
```

`pnpm dev` lance:

- le frontend (`apps/web`)
- les emulateurs Firebase (`auth`, `firestore`, `functions`)
- import/export automatique des donnees emulateur dans `.emulator-data/` (persistance locale)

## Documentation

- Regles agent: `AGENT.md`
- Specs produit et techniques: `docs/*.md`
- Reprise session: `progress/CHECKPOINT.md`, `progress/RECOVERY_PROTOCOL.md`
- Avancement: `progress/STATUS.md`
