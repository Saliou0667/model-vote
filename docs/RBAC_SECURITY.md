# RBAC_SECURITY.md — Rôles, Permissions & Sécurité

**Version :** 1.0 (MVP)
**Dernière mise à jour :** 2026-02-07

---

## 1. Rôles

| Rôle         | Stockage                            | Attribution                     |
| ------------ | ----------------------------------- | ------------------------------- |
| `member`     | `members/{uid}.role = "member"`     | Par défaut à l'inscription      |
| `admin`      | `members/{uid}.role = "admin"`      | Promu par SuperAdmin            |
| `superadmin` | `members/{uid}.role = "superadmin"` | Créé manuellement ou 1er compte |

> Il peut y avoir **plusieurs admins** et **plusieurs SuperAdmins**. Les admins sont **globaux** (pas limités à une section).
> Recommandation opérationnelle: limiter le nombre de SuperAdmins (1 à 2 comptes "root") pour l'attribution/retrait des rôles Admin et les opérations d'audit.

---

## 2. Matrice de permissions

> Les permissions ci-dessous sont des permissions **fonctionnelles**.
> Côté technique, toutes les mutations passent par Cloud Functions.

### 2.1 Membres (`members/`)

| Action                      | member              | admin | superadmin |
| --------------------------- | ------------------- | ----- | ---------- |
| Lire son propre profil      | ✅                  | ✅    | ✅         |
| Modifier son propre profil  | ✅ (champs limités) | ✅    | ✅         |
| Lire tous les profils       | ❌                  | ✅    | ✅         |
| Créer un membre             | ❌                  | ✅    | ✅         |
| Modifier un membre          | ❌                  | ✅    | ✅         |
| Suspendre un membre         | ❌                  | ✅    | ✅         |
| Changer le rôle d'un membre | ❌                  | ❌    | ✅         |

### 2.2 Sections (`sections/`)

| Action                     | member | admin | superadmin |
| -------------------------- | ------ | ----- | ---------- |
| Lire les sections          | ✅     | ✅    | ✅         |
| Créer/Modifier une section | ❌     | ✅    | ✅         |
| Supprimer une section      | ❌     | ❌    | ✅         |

### 2.3 Conditions (`conditions/`)

| Action                               | member                                 | admin | superadmin |
| ------------------------------------ | -------------------------------------- | ----- | ---------- |
| Lire les conditions                  | ✅ (catalogue + checklist personnelle) | ✅    | ✅         |
| Créer une condition                  | ❌                                     | ❌    | ✅         |
| Modifier/Archiver une condition      | ❌                                     | ❌    | ✅         |
| Valider une condition pour un membre | ❌                                     | ✅    | ✅         |

### 2.4 Cotisations & Paiements

| Action                              | member | admin | superadmin    |
| ----------------------------------- | ------ | ----- | ------------- |
| Voir ses propres paiements          | ✅     | —     | —             |
| Voir tous les paiements             | ❌     | ✅    | ✅            |
| Enregistrer un paiement             | ❌     | ✅    | ✅            |
| Modifier la politique de cotisation | ❌     | ❌    | ✅            |
| Supprimer un paiement               | ❌     | ❌    | ❌ (INTERDIT) |

### 2.5 Élections (`elections/`)

| Action                                 | member                 | admin       | superadmin    |
| -------------------------------------- | ---------------------- | ----------- | ------------- |
| Voir les élections (liste)             | ✅ (ouvertes/publiées) | ✅ (toutes) | ✅ (toutes)   |
| Créer une élection                     | ❌                     | ✅          | ✅            |
| Modifier une élection (draft)          | ❌                     | ✅          | ✅            |
| Modifier une élection (ouverte/fermée) | ❌                     | ❌          | ✅ (avec log) |
| Ouvrir une élection                    | ❌                     | ✅          | ✅            |
| Fermer une élection                    | ❌                     | ✅          | ✅            |
| Publier les résultats                  | ❌                     | ✅          | ✅            |

### 2.6 Candidats

| Action                                 | member | admin | superadmin    |
| -------------------------------------- | ------ | ----- | ------------- |
| Voir les candidats (élection ouverte)  | ✅     | ✅    | ✅            |
| Proposer un candidat                   | ❌     | ✅    | ✅            |
| Valider/Rejeter un candidat            | ❌     | ✅    | ✅            |
| Modifier un candidat (avant ouverture) | ❌     | ✅    | ✅            |
| Modifier un candidat (après ouverture) | ❌     | ❌    | ✅ (avec log) |

### 2.7 Vote & Bulletins

| Action                                 | member           | admin                              | superadmin                         |
| -------------------------------------- | ---------------- | ---------------------------------- | ---------------------------------- |
| Voter                                  | ✅ (si éligible) | ❌ (sauf si aussi membre éligible) | ❌ (sauf si aussi membre éligible) |
| Lire les bulletins (`ballots/`)        | ❌               | ❌                                 | ❌ (via audit uniquement)          |
| Lire le `tokenIndex`                   | ❌               | ❌                                 | ❌ (via audit uniquement)          |
| Voir la participation (%)              | ❌               | ✅                                 | ✅                                 |
| Voir les résultats (après publication) | ✅               | ✅                                 | ✅                                 |

### 2.8 Audit & Logs

| Action                  | member | admin                                      | superadmin                    |
| ----------------------- | ------ | ------------------------------------------ | ----------------------------- |
| Voir les logs d'actions | ❌     | ✅ (actions non-audit, via `getAuditLogs`) | ✅ (tous, via `getAuditLogs`) |
| Accès audit break-glass | ❌     | ❌                                         | ✅ (avec motif)               |
| Export des données      | ❌     | ✅ (limité)                                | ✅ (complet)                  |

---

## 3. Règles Firestore (`firestore.rules`)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // === HELPERS ===
    function isAuth() {
      return request.auth != null;
    }
    function hasUserDoc() {
      return isAuth() && exists(/databases/$(database)/documents/members/$(request.auth.uid));
    }
    function getUserRole() {
      return hasUserDoc()
        ? get(/databases/$(database)/documents/members/$(request.auth.uid)).data.role
        : null;
    }
    function isAdmin() {
      return isAuth() && getUserRole() in ["admin", "superadmin"];
    }
    function isSuperAdmin() {
      return isAuth() && getUserRole() == "superadmin";
    }
    function isOwner(uid) {
      return isAuth() && request.auth.uid == uid;
    }

    // === MEMBERS ===
    match /members/{memberId} {
      allow read: if isOwner(memberId) || isAdmin();
      allow write: if false;
      // Mutations uniquement via Cloud Functions:
      // createMember, updateMember, changeRole
    }

    // === SECTIONS ===
    match /sections/{sectionId} {
      allow read: if isAuth();
      allow write: if false;
      // Mutations uniquement via Cloud Functions
    }

    // === CONDITIONS ===
    match /conditions/{conditionId} {
      allow read: if isAuth();
      allow write: if false;
      // Mutations uniquement via Cloud Functions
    }

    // === MEMBER CONDITIONS ===
    match /memberConditions/{docId} {
      allow read: if isAuth() && (
        resource.data.memberId == request.auth.uid || isAdmin()
      );
      allow write: if false;
      // Mutations uniquement via Cloud Functions (validateCondition)
    }

    // === CONTRIBUTION POLICIES ===
    match /contributionPolicies/{policyId} {
      allow read: if isAuth();
      allow write: if false;
      // Mutations uniquement via Cloud Functions (setContributionPolicy)
    }

    // === PAYMENTS (APPEND-ONLY) ===
    match /payments/{paymentId} {
      allow read: if isAuth() && (
        resource.data.memberId == request.auth.uid || isAdmin()
      );
      allow write: if false;
      // Écriture via Cloud Function recordPayment uniquement
    }

    // === ELECTIONS ===
    match /elections/{electionId} {
      allow read: if isAdmin() || (
        isAuth() && resource.data.status in ["open", "published"]
      );
      allow write: if false;
      // Mutations uniquement via Cloud Functions

      // --- CANDIDATES ---
      match /candidates/{candidateId} {
        allow read: if isAdmin() || (
          isAuth() &&
          get(/databases/$(database)/documents/elections/$(electionId)).data.status in ["open", "published"]
        );
        allow write: if false;
        // Mutations via addCandidate/validateCandidate/removeCandidate
      }

      // --- BALLOTS (CONFIDENTIAL — NO CLIENT ACCESS) ---
      match /ballots/{ballotId} {
        allow read, write: if false;
        // ALL access via Cloud Functions only
      }

      // --- TOKEN INDEX (AUDIT ONLY — NO CLIENT ACCESS) ---
      match /tokenIndex/{memberId} {
        allow read, write: if false;
        // ALL access via Cloud Functions only
      }

      // --- RESULTS ---
      match /results/{candidateId} {
        allow read: if isAdmin() || (
          isAuth() &&
          get(/databases/$(database)/documents/elections/$(electionId)).data.status == "published"
        );
        allow write: if false;
        // Written by Cloud Functions only
      }
    }

    // === AUDIT LOGS (NO DIRECT CLIENT ACCESS) ===
    match /auditLogs/{logId} {
      allow read, write: if false;
      // Lecture via Cloud Function getAuditLogs avec filtrage par rôle
    }
  }
}
```

> Note: les Cloud Functions (Admin SDK) contournent ces règles et restent le seul canal de mutation métier.

---

## 4. Séparation des données sensibles

```
┌─────────────────────────────────────────┐
│         ZONE PUBLIQUE (membres)         │
│                                         │
│  members/  sections/  conditions/       │
│  memberConditions/  payments/           │
│  elections/  candidates/  results/      │
│                                         │
│  → Accessible selon rôle (voir matrice) │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│     ZONE CONFIDENTIELLE (vote)          │
│                                         │
│  elections/{}/ballots/                  │
│  elections/{}/tokenIndex/               │
│                                         │
│  → Accès UNIQUEMENT via Cloud Functions │
│  → Jamais lisible depuis le client      │
│  → tokenIndex = audit SuperAdmin seul   │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│      ZONE TRAÇABILITÉ (logs)            │
│                                         │
│  auditLogs/                             │
│                                         │
│  → Écriture via Cloud Functions only    │
│  → Lecture via `getAuditLogs` seulement │
│    (admin filtré, superadmin complet)   │
│  → Suppression/modification INTERDITE   │
└─────────────────────────────────────────┘
```

---

## 5. Politique d'audit break-glass

### Conditions d'accès

1. Seul un **SuperAdmin** peut initier un audit
2. Un **motif** textuel est **obligatoire**
3. Chaque action d'audit est **loggée** dans `auditLogs/` avec :
   - `action: "audit.access"` ou `"audit.export"`
   - `details.reason` : le motif saisi
   - `details.scope` : ce qui a été consulté
4. Un audit ne peut accéder qu'à **une élection à la fois**

### Actions d'audit possibles

- Vérifier si un membre a voté (oui/non) → lecture `tokenIndex/{memberId}.hasVoted`
- Retrouver le bulletin associé → lecture `tokenIndex` + `ballots/`
- Exporter les bulletins anonymisés → export depuis `ballots/`

---

## 6. Sécurité supplémentaire

### Côté Cloud Functions

- Toutes les Cloud Functions vérifient le rôle de l'appelant via `context.auth`
- Les opérations de vote vérifient `election.endAt > now` (côté serveur)
- Les mutations sensibles créent systématiquement un `auditLog`
- Rate limiting sur `castVote` (1 appel / membre / élection)

### Côté Client

- Aucune écriture directe dans `ballots/` ou `tokenIndex/`
- Le client n'a jamais accès aux données corrélant membre ↔ vote
- Les routes admin sont protégées par vérification du rôle
- Les tokens Firebase sont renouvelés avec des custom claims si nécessaire

### Protection anti-triche

- 1 jeton par membre par élection (document ID = memberId dans tokenIndex)
- 1 bulletin par jeton (document ID = voteToken dans ballots)
- Vote impossible après `endAt` (vérifié côté serveur)
- Un membre ne peut pas ré-émettre un jeton (issuance uniquement via `castVote`)
