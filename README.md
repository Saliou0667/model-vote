# model-vote

Application de vote interne du `MODEL` (Mouvement Democratique Liberal), basee sur React + Firebase.

## Etat du projet

- Milestone courant: `M0` (socle technique)
- Web app + Firebase Functions en place
- Auth email/password + routing par role + layouts membre/admin
- Firebase Emulator Suite configuree

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
pnpm dev
pnpm build
pnpm lint
pnpm test
pnpm typecheck
```

`pnpm dev` lance:

- le frontend (`apps/web`)
- les emulateurs Firebase (`auth`, `firestore`, `functions`)

## Documentation

- Regles agent: `AGENT.md`
- Specs produit et techniques: `docs/*.md`
- Reprise session: `progress/CHECKPOINT.md`, `progress/RECOVERY_PROTOCOL.md`
- Avancement: `progress/STATUS.md`
