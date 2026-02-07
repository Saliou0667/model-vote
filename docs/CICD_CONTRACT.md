# CICD_CONTRACT.md — Contrat CI/CD bloquant

**Version :** 1.0  
**Dernière mise à jour :** 2026-02-07

---

## Checks obligatoires sur PR

1. Lint (`web` + `functions`)
2. Typecheck (`web` + `functions`)
3. Tests unitaires
4. Tests d'intégration (Firebase Emulators)
5. E2E Playwright smoke
6. Couverture minimum:
   - `functions >= 80%`
   - `web >= 60%`

---

## Politique de merge

- Merge interdit si un check échoue.
- Déploiement `prod` manuel (validation explicite).
