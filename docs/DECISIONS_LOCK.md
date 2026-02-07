# DECISIONS_LOCK.md — Choix figés du projet

**Version :** 1.0  
**Dernière mise à jour :** 2026-02-07

---

## 1) Produit

- Organisation: **MODEL** (Mouvement Démocratique Libéral)
- Langue UI: **Français (fr-FR)**
- Timezone métier: **Europe/Paris**
- Format date: `dd/MM/yyyy`
- Format heure: `24h`

---

## 2) Rôles et gouvernance

- Rôles: `member`, `admin`, `superadmin`
- Admins multiples, **globaux** (non limités par section)
- SuperAdmin:
  - gère les rôles admin/superadmin
  - accède aux logs complets
  - peut lancer l'audit break-glass

---

## 3) Confidentialité et audit

- Member/Admin: jamais d'accès à `ballots` / `tokenIndex`
- Audit reveal vote: **activé côté backend**
- UI audit: **désactivée par défaut** dans la navigation classique, accessible uniquement via écran SuperAdmin `Audit`
- Motif obligatoire pour toute action audit
- Toutes les actions audit sont loggées

---

## 4) Résultats

- Admin: résultats agrégés après clôture
- Member: résultats seulement après publication (`published`)
- Pas d'affichage de tendances de vote individuelles

---

## 5) Élections et éligibilité

- Statuts élection: `draft -> open -> closed -> published -> archived`
- Après `open`: règles/candidats verrouillés (sauf superadmin + log)
- Deadline serveur stricte: aucun vote après `endAt`
- Éligibilité MVP:
  - membre `active`
  - cotisation à jour
  - ancienneté minimale
  - section autorisée (si restriction active)

---

## 6) Technique

- Monorepo `pnpm` avec `apps/web` + `functions`
- Mutations métier via Cloud Functions uniquement
- Source de vérité RBAC: `members/{uid}.role`
