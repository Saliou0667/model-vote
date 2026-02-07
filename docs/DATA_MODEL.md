# DATA_MODEL.md — Modèle de données Firestore

**Version :** 1.0 (MVP)
**Dernière mise à jour :** 2026-02-07

---

## Principes

1. **Séparation stricte** : données membres ≠ urne (bulletins de vote)
2. **Append-only** pour paiements et logs (jamais de suppression)
3. **Pas de jointure** côté client entre `members` et `ballots`
4. **Index composites** déclarés dans `firestore.indexes.json`
5. **Source de vérité RBAC** : le rôle est stocké dans `members/{uid}.role` (pas de collection `roles/` séparée dans ce MVP)

---

## Collections

### 1. `members` — Profils membres

```
members/{memberId}
```

| Champ              | Type        | Description                                |
| ------------------ | ----------- | ------------------------------------------ |
| `uid`              | `string`    | Firebase Auth UID (= document ID)          |
| `email`            | `string`    | Email (unique)                             |
| `emailVerified`    | `boolean`   | Email vérifié                              |
| `firstName`        | `string`    | Prénom                                     |
| `lastName`         | `string`    | Nom                                        |
| `phone`            | `string`    | Téléphone (optionnel)                      |
| `sectionId`        | `string`    | Référence vers `sections/{sectionId}`      |
| `role`             | `string`    | `"member"` \| `"admin"` \| `"superadmin"`  |
| `status`           | `string`    | `"pending"` \| `"active"` \| `"suspended"` |
| `joinedAt`         | `timestamp` | Date d'inscription                         |
| `createdAt`        | `timestamp` | Date de création du document               |
| `updatedAt`        | `timestamp` | Dernière modification                      |
| `profileCompleted` | `boolean`   | Profil complet ou non                      |

**Index composites :**

- `(sectionId, status)` — filtrage membres par section et statut
- `(role, status)` — filtrage par rôle

---

### 2. `sections` — Sections/Villes

```
sections/{sectionId}
```

| Champ         | Type        | Description                       |
| ------------- | ----------- | --------------------------------- |
| `name`        | `string`    | Nom de la section                 |
| `city`        | `string`    | Ville                             |
| `region`      | `string`    | Région (optionnel)                |
| `createdAt`   | `timestamp` | Date de création                  |
| `updatedAt`   | `timestamp` | Dernière modification             |
| `memberCount` | `number`    | Compteur de membres (dénormalisé) |

---

### 3. `conditions` — Catalogue de conditions d'éligibilité

```
conditions/{conditionId}
```

| Champ              | Type             | Description                                                    |
| ------------------ | ---------------- | -------------------------------------------------------------- |
| `name`             | `string`         | Nom (ex: "Cotisation à jour")                                  |
| `description`      | `string`         | Description détaillée                                          |
| `type`             | `string`         | `"checkbox"` \| `"date"` \| `"amount"` \| `"file"` \| `"text"` |
| `validatedBy`      | `string`         | `"admin"` (qui peut valider)                                   |
| `validityDuration` | `number \| null` | Durée de validité en jours (null = permanent)                  |
| `createdBy`        | `string`         | UID de l'admin ou superadmin créateur                          |
| `createdAt`        | `timestamp`      |                                                                |
| `updatedAt`        | `timestamp`      |                                                                |
| `isActive`         | `boolean`        | Condition active ou archivée                                   |

---

### 4. `memberConditions` — Statut des conditions par membre

```
memberConditions/{memberId_conditionId}
```

| Champ         | Type                | Description                     |
| ------------- | ------------------- | ------------------------------- |
| `memberId`    | `string`            | Référence vers `members/`       |
| `conditionId` | `string`            | Référence vers `conditions/`    |
| `validated`   | `boolean`           | Validé ou non                   |
| `validatedBy` | `string`            | UID de l'admin validateur       |
| `validatedAt` | `timestamp \| null` | Date de validation              |
| `expiresAt`   | `timestamp \| null` | Date d'expiration               |
| `note`        | `string`            | Note de l'admin                 |
| `evidence`    | `string \| null`    | URL du justificatif (optionnel) |
| `updatedAt`   | `timestamp`         |                                 |

**Index composites :**

- `(memberId, validated)` — conditions validées d'un membre
- `(conditionId, validated)` — membres ayant validé une condition

---

### 5. `contributionPolicies` — Politique de cotisation

```
contributionPolicies/{policyId}
```

| Champ             | Type        | Description                                |
| ----------------- | ----------- | ------------------------------------------ |
| `name`            | `string`    | Nom de la politique                        |
| `amount`          | `number`    | Montant en unité monétaire                 |
| `currency`        | `string`    | Code devise (ex: "EUR", "XOF")             |
| `periodicity`     | `string`    | `"monthly"` \| `"quarterly"` \| `"yearly"` |
| `gracePeriodDays` | `number`    | Nombre de jours de tolérance               |
| `isActive`        | `boolean`   | Politique en vigueur                       |
| `createdBy`       | `string`    | UID du créateur                            |
| `createdAt`       | `timestamp` |                                            |
| `updatedAt`       | `timestamp` |                                            |

---

### 6. `payments` — Paiements de cotisation (APPEND-ONLY)

```
payments/{paymentId}
```

| Champ         | Type        | Description                            |
| ------------- | ----------- | -------------------------------------- |
| `memberId`    | `string`    | Référence vers `members/`              |
| `policyId`    | `string`    | Référence vers `contributionPolicies/` |
| `amount`      | `number`    | Montant payé                           |
| `currency`    | `string`    | Devise                                 |
| `periodStart` | `timestamp` | Début de la période couverte           |
| `periodEnd`   | `timestamp` | Fin de la période couverte             |
| `reference`   | `string`    | Référence du paiement (ex: reçu)       |
| `recordedBy`  | `string`    | UID de l'admin qui a saisi             |
| `recordedAt`  | `timestamp` | Date d'enregistrement                  |
| `note`        | `string`    | Note (optionnel)                       |

**Règle : JAMAIS de suppression ni modification. Corrections via un nouveau document avec note.**

**Index composites :**

- `(memberId, periodEnd DESC)` — derniers paiements d'un membre
- `(memberId, recordedAt DESC)` — historique chronologique

---

### 7. `elections` — Élections

```
elections/{electionId}
```

| Champ                   | Type                | Description                                                          |
| ----------------------- | ------------------- | -------------------------------------------------------------------- |
| `title`                 | `string`            | Titre de l'élection                                                  |
| `description`           | `string`            | Description                                                          |
| `type`                  | `string`            | `"federal"` \| `"section"` \| `"other"`                              |
| `status`                | `string`            | `"draft"` \| `"open"` \| `"closed"` \| `"published"` \| `"archived"` |
| `startAt`               | `timestamp`         | Date/heure d'ouverture                                               |
| `endAt`                 | `timestamp`         | Date/heure de clôture                                                |
| `voterConditionIds`     | `string[]`          | Conditions pour voter                                                |
| `candidateConditionIds` | `string[]`          | Conditions pour être candidat                                        |
| `allowedSectionIds`     | `string[] \| null`  | Sections autorisées (null = toutes)                                  |
| `minSeniority`          | `number`            | Ancienneté minimum en jours                                          |
| `quorum`                | `number \| null`    | Quorum requis (% des éligibles, optionnel)                           |
| `totalEligibleVoters`   | `number`            | Nombre d'éligibles (calculé à l'ouverture)                           |
| `totalVotesCast`        | `number`            | Nombre de votes enregistrés (mis à jour par Function)                |
| `createdBy`             | `string`            | UID du créateur                                                      |
| `createdAt`             | `timestamp`         |                                                                      |
| `updatedAt`             | `timestamp`         |                                                                      |
| `lockedAt`              | `timestamp \| null` | Date de verrouillage                                                 |
| `closedAt`              | `timestamp \| null` | Date de clôture effective                                            |
| `publishedAt`           | `timestamp \| null` | Date de publication des résultats                                    |

**Index composites :**

- `(status, startAt)` — élections ouvertes triées par date

---

### 8. `candidates` — Candidats par élection

```
elections/{electionId}/candidates/{candidateId}
```

| Champ          | Type             | Description                                   |
| -------------- | ---------------- | --------------------------------------------- |
| `memberId`     | `string`         | Référence vers `members/`                     |
| `displayName`  | `string`         | Nom affiché                                   |
| `sectionName`  | `string`         | Section (dénormalisé)                         |
| `bio`          | `string`         | Mini biographie / programme                   |
| `photoUrl`     | `string \| null` | URL photo                                     |
| `status`       | `string`         | `"proposed"` \| `"validated"` \| `"rejected"` |
| `displayOrder` | `number`         | Ordre d'affichage (randomisé)                 |
| `addedBy`      | `string`         | UID de l'admin                                |
| `createdAt`    | `timestamp`      |                                               |
| `updatedAt`    | `timestamp`      |                                               |

---

### 9. `ballots` — Bulletins de vote (URNE — CONFIDENTIELLE)

```
elections/{electionId}/ballots/{ballotId}
```

| Champ         | Type        | Description                       |
| ------------- | ----------- | --------------------------------- |
| `voteToken`   | `string`    | Jeton anonyme unique              |
| `candidateId` | `string`    | Référence vers le candidat choisi |
| `castAt`      | `timestamp` | Horodatage du vote                |

**RÈGLES CRITIQUES :**

- `ballotId` = `voteToken` (pour empêcher les doublons)
- Aucun champ `memberId` — le bulletin est **anonyme**
- Écriture **uniquement** via Cloud Function `castVote`
- Lecture interdite aux rôles `member` et `admin`
- Lecture SuperAdmin uniquement via fonction audit

---

### 10. `tokenIndex` — Lien membre ↔ jeton (AUDIT UNIQUEMENT)

```
elections/{electionId}/tokenIndex/{memberId}
```

| Champ       | Type                | Description              |
| ----------- | ------------------- | ------------------------ |
| `voteToken` | `string`            | Jeton attribué           |
| `issuedAt`  | `timestamp`         | Date d'émission du jeton |
| `hasVoted`  | `boolean`           | A voté ou non            |
| `votedAt`   | `timestamp \| null` | Date du vote             |

**RÈGLES CRITIQUES :**

- Document ID = `memberId` (empêche double jeton)
- Écriture **uniquement** via Cloud Functions
- Lecture **uniquement** par SuperAdmin via fonction audit
- Jamais accessible depuis le client

---

### 11. `results` — Résultats (calculés après clôture)

```
elections/{electionId}/results/{candidateId}
```

| Champ         | Type        | Description                   |
| ------------- | ----------- | ----------------------------- |
| `candidateId` | `string`    | Référence vers le candidat    |
| `displayName` | `string`    | Nom du candidat (dénormalisé) |
| `voteCount`   | `number`    | Nombre de votes reçus         |
| `percentage`  | `number`    | % des votes                   |
| `rank`        | `number`    | Classement                    |
| `computedAt`  | `timestamp` | Date du calcul                |

---

### 12. `auditLogs` — Logs d'audit (APPEND-ONLY)

```
auditLogs/{logId}
```

| Champ        | Type             | Description                                                                                                                         |
| ------------ | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `action`     | `string`         | Type d'action (voir liste ci-dessous)                                                                                               |
| `actorId`    | `string`         | UID de l'utilisateur ayant agi                                                                                                      |
| `actorRole`  | `string`         | Rôle au moment de l'action                                                                                                          |
| `targetType` | `string`         | `"member"` \| `"section"` \| `"election"` \| `"candidate"` \| `"payment"` \| `"policy"` \| `"condition"` \| `"audit"` \| `"export"` |
| `targetId`   | `string`         | ID de la cible                                                                                                                      |
| `details`    | `map`            | Détails supplémentaires (avant/après, raison, etc.)                                                                                 |
| `ip`         | `string \| null` | IP (optionnel)                                                                                                                      |
| `timestamp`  | `timestamp`      |                                                                                                                                     |

**Actions loggées :**

- `section.create`, `section.update`, `section.delete`
- `member.create`, `member.update`, `member.suspend`
- `member.role_change`
- `condition.create`, `condition.update`
- `condition.validate`, `condition.invalidate`
- `payment.record`
- `policy.create`, `policy.update`
- `election.create`, `election.update`, `election.open`, `election.close`, `election.publish`
- `candidate.add`, `candidate.validate`, `candidate.reject`, `candidate.remove`
- `vote.cast` (sans détail du choix)
- `audit.access`, `audit.export`
- `export.generate`

**Règle : JAMAIS de suppression ni modification.**

**Index composites :**

- `(action, timestamp DESC)` — filtrage par type d'action
- `(actorId, timestamp DESC)` — actions d'un utilisateur
- `(targetType, targetId, timestamp DESC)` — historique d'une entité

---

## Diagramme des relations

```
members ──┬── memberConditions ──── conditions
           │
           ├── payments ──── contributionPolicies
           │
           ├── elections/{}/candidates
           │
           └── elections/{}/tokenIndex  (AUDIT ONLY)
                     │
                     └── elections/{}/ballots  (ANONYME)
                              │
                              └── elections/{}/results

auditLogs (transversal, append-only)
sections (référencé par members.sectionId)
```

---

## Règles d'intégrité

1. Un membre ne peut avoir qu'un seul document dans `tokenIndex` par élection
2. Un `ballot` ne peut être créé que si un `tokenIndex` existe avec `hasVoted = false`
3. Les paiements ne sont jamais supprimés — corrections via nouveau document
4. Les logs d'audit ne sont jamais supprimés ni modifiés
5. `election.totalVotesCast` est incrémenté atomiquement via `FieldValue.increment(1)`
6. Les `results` sont calculés uniquement quand `election.status === "closed"`
