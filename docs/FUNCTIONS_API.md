# FUNCTIONS_API.md — Cloud Functions Firebase

**Version :** 1.0 (MVP)
**Dernière mise à jour :** 2026-02-07

---

## Principes

1. **Toutes les opérations sensibles** passent par des Cloud Functions (jamais d'écriture client directe)
2. Chaque fonction vérifie le **rôle de l'appelant** via `context.auth`
3. Chaque fonction sensible crée un **audit log**
4. Les fonctions retournent des erreurs structurées avec codes et messages
5. Runtime : **Node.js 18+ / TypeScript**
6. Les mutations Firestore métier sont faites **uniquement** via ces fonctions

---

## Format de réponse standard

### Succès

```json
{
  "success": true,
  "data": { ... }
}
```

### Erreur

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Message lisible"
  }
}
```

---

## Liste des Cloud Functions

### 1. Authentification & Membres

#### `createMember`

- **Trigger** : `onCall`
- **Rôle requis** : `admin` | `superadmin`
- **Input** :
  ```ts
  {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    sectionId: string;
  }
  ```
- **Actions** :
  1. Créer le compte Firebase Auth
  2. Créer le document `members/{uid}`
  3. Envoyer email de vérification
  4. Logger `member.create`
- **Output** : `{ memberId: string }`
- **Erreurs** :
  - `ERROR_EMAIL_EXISTS` : email déjà utilisé
  - `ERROR_SECTION_NOT_FOUND` : section invalide
  - `ERROR_UNAUTHORIZED` : rôle insuffisant

#### `updateMember`

- **Trigger** : `onCall`
- **Rôle requis** : `admin` | `superadmin` (ou le membre lui-même pour champs limités)
- **Input** :
  ```ts
  {
    memberId: string;
    updates: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      sectionId?: string; // admin+ only
      status?: "active" | "suspended"; // admin+ only
    }
  }
  ```
- **Actions** :
  1. Valider les permissions (membre ne peut changer que ses propres infos basiques)
  2. Mettre à jour `members/{memberId}`
  3. Logger `member.update`
- **Erreurs** :
  - `ERROR_MEMBER_NOT_FOUND`
  - `ERROR_UNAUTHORIZED`

#### `changeRole`

- **Trigger** : `onCall`
- **Rôle requis** : `superadmin`
- **Input** :
  ```ts
  {
    memberId: string;
    newRole: "member" | "admin" | "superadmin";
  }
  ```
- **Actions** :
  1. Vérifier que l'appelant est SuperAdmin
  2. Mettre à jour `members/{memberId}.role`
  3. Logger `member.role_change` avec ancien et nouveau rôle
- **Erreurs** :
  - `ERROR_CANNOT_CHANGE_OWN_ROLE`
  - `ERROR_UNAUTHORIZED`

---

### 2. Sections

#### `createSection`

- **Trigger** : `onCall`
- **Rôle requis** : `admin` | `superadmin`
- **Input** :
  ```ts
  {
    name: string;
    city: string;
    region?: string;
  }
  ```
- **Actions** :
  1. Créer `sections/{sectionId}`
  2. Logger `section.create`
- **Output** : `{ sectionId: string }`

#### `updateSection`

- **Trigger** : `onCall`
- **Rôle requis** : `admin` | `superadmin`
- **Input** :
  ```ts
  {
    sectionId: string;
    updates: {
      name?: string;
      city?: string;
      region?: string;
    }
  }
  ```
- **Actions** :
  1. Mettre à jour `sections/{sectionId}`
  2. Logger `section.update`
- **Erreurs** :
  - `ERROR_SECTION_NOT_FOUND`

#### `deleteSection`

- **Trigger** : `onCall`
- **Rôle requis** : `superadmin`
- **Input** :
  ```ts
  {
    sectionId: string;
  }
  ```
- **Actions** :
  1. Vérifier qu'aucun membre n'est rattaché à la section
  2. Supprimer `sections/{sectionId}`
  3. Logger `section.delete`
- **Erreurs** :
  - `ERROR_SECTION_NOT_FOUND`
  - `ERROR_SECTION_NOT_EMPTY`
  - `ERROR_UNAUTHORIZED`

---

### 3. Conditions & Validation

#### `createCondition`

- **Trigger** : `onCall`
- **Rôle requis** : `admin` | `superadmin`
- **Input** :
  ```ts
  {
    name: string;
    description: string;
    type: "checkbox" | "date" | "amount" | "file" | "text";
    validityDuration?: number; // jours, null = permanent
  }
  ```
- **Actions** :
  1. Créer document `conditions/{conditionId}`
  2. Logger `condition.create`
- **Output** : `{ conditionId: string }`

#### `updateCondition`

- **Trigger** : `onCall`
- **Rôle requis** : `admin` | `superadmin`
- **Input** :
  ```ts
  {
    conditionId: string;
    updates: {
      name?: string;
      description?: string;
      isActive?: boolean;
      validityDuration?: number | null;
    }
  }
  ```
- **Actions** :
  1. Mettre à jour `conditions/{conditionId}`
  2. Logger `condition.update`

#### `validateCondition`

- **Trigger** : `onCall`
- **Rôle requis** : `admin` | `superadmin`
- **Input** :
  ```ts
  {
    memberId: string;
    conditionId: string;
    validated: boolean;
    note?: string;
    evidence?: string; // URL
  }
  ```
- **Actions** :
  1. Créer/Mettre à jour `memberConditions/{memberId_conditionId}`
  2. Calculer `expiresAt` si validityDuration existe
  3. Logger `condition.validate` ou `condition.invalidate`
- **Erreurs** :
  - `ERROR_MEMBER_NOT_FOUND`
  - `ERROR_CONDITION_NOT_FOUND`

---

### 4. Cotisations

#### `setContributionPolicy`

- **Trigger** : `onCall`
- **Rôle requis** : `superadmin`
- **Input** :
  ```ts
  {
    name: string;
    amount: number;
    currency: string;
    periodicity: "monthly" | "quarterly" | "yearly";
    gracePeriodDays: number;
  }
  ```
- **Actions** :
  1. Désactiver l'ancienne politique active
  2. Créer nouvelle politique `contributionPolicies/{policyId}`
  3. Logger `policy.update` (ancienne politique désactivée) + `policy.create` (nouvelle politique active)
- **Output** : `{ policyId: string }`

#### `recordPayment`

- **Trigger** : `onCall`
- **Rôle requis** : `admin` | `superadmin`
- **Input** :
  ```ts
  {
    memberId: string;
    amount: number;
    currency: string;
    periodStart: Timestamp;
    periodEnd: Timestamp;
    reference?: string;
    note?: string;
  }
  ```
- **Actions** :
  1. Vérifier que le membre existe
  2. Créer document `payments/{paymentId}` (append-only)
  3. Logger `payment.record`
- **Output** : `{ paymentId: string }`
- **Erreurs** :
  - `ERROR_MEMBER_NOT_FOUND`
  - `ERROR_INVALID_AMOUNT`
  - `ERROR_INVALID_PERIOD`

#### `computeEligibility`

- **Trigger** : `onCall`
- **Rôle requis** : `admin` | `superadmin` (ou `member` pour soi-même)
- **Input** :
  ```ts
  {
    memberId: string;
    electionId: string;
  }
  ```
- **Actions** :
  1. Charger l'élection et ses conditions requises
  2. Vérifier cotisation à jour (dernier paiement + politique + tolérance)
  3. Vérifier ancienneté (`joinedAt` + `minSeniority`)
  4. Vérifier section autorisée
  5. Vérifier conditions validées dans `memberConditions/`
- **Output** :
  ```ts
  {
    eligible: boolean;
    reasons: Array<{
      condition: string;
      met: boolean;
      detail: string;
    }>;
  }
  ```

---

### 5. Élections

#### `createElection`

- **Trigger** : `onCall`
- **Rôle requis** : `admin` | `superadmin`
- **Input** :
  ```ts
  {
    title: string;
    description: string;
    type: "federal" | "section" | "other";
    startAt: Timestamp;
    endAt: Timestamp;
    voterConditionIds: string[];
    candidateConditionIds: string[];
    allowedSectionIds?: string[] | null;
    minSeniority: number; // jours
    quorum?: number | null;
  }
  ```
- **Actions** :
  1. Valider les dates (`endAt > startAt > now`)
  2. Valider que les conditions existent
  3. Créer `elections/{electionId}` avec statut `"draft"`
  4. Logger `election.create`
- **Output** : `{ electionId: string }`

#### `updateElection`

- **Trigger** : `onCall`
- **Rôle requis** : `admin` (si draft) | `superadmin` (si autre statut, avec log)
- **Input** :
  ```ts
  {
    electionId: string;
    updates: { ... } // mêmes champs que create (partiels)
  }
  ```
- **Actions** :
  1. Vérifier statut (si pas draft, seul SuperAdmin peut modifier)
  2. Mettre à jour
  3. Logger `election.update`
- **Erreurs** :
  - `ERROR_ELECTION_LOCKED` : élection ouverte, non modifiable par admin

#### `openElection`

- **Trigger** : `onCall`
- **Rôle requis** : `admin` | `superadmin`
- **Input** : `{ electionId: string }`
- **Actions** :
  1. Vérifier qu'il y a au moins 2 candidats validés
  2. Calculer `totalEligibleVoters`
  3. Randomiser l'ordre des candidats (`displayOrder`)
  4. Passer statut à `"open"` + set `lockedAt`
  5. Logger `election.open`
- **Erreurs** :
  - `ERROR_NO_CANDIDATES` : pas assez de candidats
  - `ERROR_INVALID_DATES` : dates invalides

#### `closeElection`

- **Trigger** : `onCall` (ou `onSchedule` si auto)
- **Rôle requis** : `admin` | `superadmin`
- **Input** : `{ electionId: string }`
- **Actions** :
  1. Passer statut à `"closed"` + set `closedAt`
  2. Logger `election.close`
- Note : peut aussi être déclenché automatiquement par un scheduled function à `endAt`

#### `publishResults`

- **Trigger** : `onCall`
- **Rôle requis** : `admin` | `superadmin`
- **Input** : `{ electionId: string }`
- **Actions** :
  1. Vérifier que l'élection est `"closed"`
  2. Compter les bulletins par candidat
  3. Calculer pourcentages et classement
  4. Écrire dans `elections/{electionId}/results/`
  5. Passer statut à `"published"` + set `publishedAt`
  6. Logger `election.publish`

---

### 6. Candidats

#### `addCandidate`

- **Trigger** : `onCall`
- **Rôle requis** : `admin` | `superadmin`
- **Input** :
  ```ts
  {
    electionId: string;
    memberId: string;
    bio?: string;
    photoUrl?: string;
  }
  ```
- **Actions** :
  1. Vérifier que l'élection est en `"draft"`
  2. Vérifier éligibilité candidat
  3. Créer `elections/{electionId}/candidates/{candidateId}`
  4. Logger `candidate.add`
- **Erreurs** :
  - `ERROR_ELECTION_NOT_DRAFT`
  - `ERROR_CANDIDATE_NOT_ELIGIBLE`
  - `ERROR_CANDIDATE_ALREADY_EXISTS`

#### `validateCandidate`

- **Trigger** : `onCall`
- **Rôle requis** : `admin` | `superadmin`
- **Input** :
  ```ts
  {
    electionId: string;
    candidateId: string;
    status: "validated" | "rejected";
  }
  ```
- **Actions** :
  1. Mettre à jour statut du candidat
  2. Logger `candidate.validate` ou `candidate.reject`

#### `removeCandidate`

- **Trigger** : `onCall`
- **Rôle requis** : `admin` (si draft) | `superadmin` (si open, avec log)
- **Input** :
  ```ts
  {
    electionId: string;
    candidateId: string;
  }
  ```
- **Erreurs** :
  - `ERROR_ELECTION_NOT_DRAFT` (pour admin)

---

### 7. Vote

#### `castVote`

- **Trigger** : `onCall`
- **Rôle requis** : `member` éligible (auth required)
- **Input** :
  ```ts
  {
    electionId: string;
    candidateId: string;
  }
  ```
- **Actions** (dans une **transaction Firestore**) :
  1. Vérifier que l'élection est `"open"` + `endAt > now` (serveur)
  2. Vérifier éligibilité du membre (conditions, cotisation, ancienneté, section)
  3. Vérifier qu'il n'a pas déjà voté (`tokenIndex/{memberId}` n'existe pas ou `hasVoted === false`)
  4. Générer un `voteToken` unique (UUID v4)
  5. Créer `elections/{electionId}/tokenIndex/{memberId}` :
     ```json
     { "voteToken": "...", "issuedAt": now, "hasVoted": true, "votedAt": now }
     ```
  6. Créer `elections/{electionId}/ballots/{voteToken}` :
     ```json
     { "voteToken": "...", "candidateId": "...", "castAt": now }
     ```
  7. Incrémenter `elections/{electionId}.totalVotesCast` atomiquement
  8. Logger `vote.cast` (SANS le candidateId dans le log)
- **Output** : `{ success: true, message: "Vote enregistré" }`
- **Erreurs** :
  - `ERROR_ELECTION_CLOSED` : élection fermée ou deadline dépassée
  - `ERROR_ELECTION_NOT_OPEN` : pas encore ouverte
  - `ERROR_NOT_ELIGIBLE` : conditions non remplies
  - `ERROR_ALREADY_VOTED` : double vote
  - `ERROR_CANDIDATE_NOT_FOUND` : candidat invalide
- **IMPORTANT** : le log `vote.cast` ne contient JAMAIS `candidateId`

---

### 8. Résultats & Exports

#### `getResults`

- **Trigger** : `onCall`
- **Rôle requis** : `member` (si publié) | `admin` (si closed/published) | `superadmin`
- **Input** : `{ electionId: string }`
- **Output** :
  ```ts
  {
    election: { title, status, totalEligibleVoters, totalVotesCast, participationRate },
    results: Array<{
      candidateId: string;
      displayName: string;
      voteCount: number;
      percentage: number;
      rank: number;
    }>
  }
  ```

#### `exportResults`

- **Trigger** : `onCall`
- **Rôle requis** : `admin` | `superadmin`
- **Input** :
  ```ts
  {
    electionId: string;
    format: "csv" | "pdf";
  }
  ```
- **Actions** :
  1. Générer le fichier
  2. Logger `export.generate`
- **Output** : `{ downloadUrl: string }` (fichier temporaire)

#### `exportEligibleVoters`

- **Trigger** : `onCall`
- **Rôle requis** : `admin` | `superadmin`
- **Input** : `{ electionId: string }`
- **Output** : `{ downloadUrl: string }` (CSV avec liste des éligibles)

---

### 9. Audit (SuperAdmin)

#### `auditCheckVoter`

- **Trigger** : `onCall`
- **Rôle requis** : `superadmin`
- **Input** :
  ```ts
  {
    electionId: string;
    memberId: string;
    reason: string; // OBLIGATOIRE
  }
  ```
- **Actions** :
  1. Lire `tokenIndex/{memberId}`
  2. Logger `audit.access` avec la raison
- **Output** :
  ```ts
  {
    hasVoted: boolean;
    votedAt?: Timestamp;
  }
  ```

#### `auditRevealVote`

- **Trigger** : `onCall`
- **Rôle requis** : `superadmin`
- **Input** :
  ```ts
  {
    electionId: string;
    memberId: string;
    reason: string; // OBLIGATOIRE
  }
  ```
- **Actions** :
  1. Lire `tokenIndex/{memberId}` → obtenir `voteToken`
  2. Lire `ballots/{voteToken}` → obtenir `candidateId`
  3. Logger `audit.access` avec la raison et le scope "reveal"
- **Output** :
  ```ts
  {
    hasVoted: boolean;
    candidateId?: string;
    candidateName?: string;
    votedAt?: Timestamp;
  }
  ```
- **Note** : cette action est hautement sensible et loggée

#### `auditExportBallots`

- **Trigger** : `onCall`
- **Rôle requis** : `superadmin`
- **Input** :
  ```ts
  {
    electionId: string;
    reason: string;
  }
  ```
- **Actions** :
  1. Exporter tous les bulletins anonymisés
  2. Logger `audit.export`
- **Output** : `{ downloadUrl: string }`

---

### 10. Scheduled Functions

#### `autoCloseElection`

- **Trigger** : `onSchedule` (chaque minute ou via Cloud Scheduler)
- **Actions** :
  1. Chercher les élections `"open"` dont `endAt <= now`
  2. Passer leur statut à `"closed"`
  3. Logger `election.close` avec `actorId: "system"`

---

### 11. Logs

#### `getAuditLogs`

- **Trigger** : `onCall`
- **Rôle requis** : `admin` (logs non-audit) | `superadmin` (tous les logs)
- **Input** :
  ```ts
  {
    filters?: {
      action?: string;
      actorId?: string;
      targetType?: string;
      targetId?: string;
      startDate?: Timestamp;
      endDate?: Timestamp;
    };
    page?: number;
    pageSize?: number;
  }
  ```
- **Output** : `{ logs: AuditLog[], total: number }`
- **Restriction** : un admin ne peut voir que les logs dont `action` **ne commence pas** par `audit.`
