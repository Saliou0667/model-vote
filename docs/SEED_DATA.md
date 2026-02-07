# SEED_DATA.md — Jeu de données officiel (dev)

**Version :** 1.0  
**Dernière mise à jour :** 2026-02-07

---

## Sections

- Paris
- Lyon
- Marseille

---

## Comptes de test

- `superadmin1@model.test` (superadmin)
- `admin1@model.test` (admin)
- `admin2@model.test` (admin)
- `member_ok@model.test` (active, cotisation OK, ancienneté OK)
- `member_late@model.test` (active, cotisation en retard)
- `member_new@model.test` (active, ancienneté insuffisante)
- `member_suspended@model.test` (suspended)

---

## Politique de cotisation test

- Montant: `10 EUR`
- Périodicité: mensuelle
- Tolérance: `7 jours`

---

## Élection test

- Titre: `Élection fédérale TEST`
- Candidats validés: 2 minimum
- Conditions voter:
  - statut `active`
  - cotisation à jour
  - ancienneté minimale

---

## Scénarios obligatoires

1. `member_ok` peut voter
2. `member_late` ne peut pas voter (cotisation)
3. `member_new` ne peut pas voter (ancienneté)
4. `member_suspended` ne peut pas voter (statut)
5. Vote refusé après deadline
6. Double vote refusé
7. Admin ne lit pas `ballots`/`tokenIndex`
8. SuperAdmin peut lancer audit avec motif
