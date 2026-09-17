# Procédure de Retour Arrière (Rollback) — EduCom SaaS

> Document opérationnel d'urgence en cas d'incident critique lors d'un déploiement en production.

---

## 1. Rôles et Responsabilités

| Rôle | Intervenant | Responsabilité |
| :--- | :--- | :--- |
| **Décisionnaire Rollback** | Kory (Fondateur / Lead) | Arbitrage du go/no-go, déclenchement du rollback. |
| **Exécution Applicative** | Kory / Agent | Rollback sur Vercel, revert Git, ajustement des variables d'environnement. |
| **Exécution Base de Données** | Kory / Agent | Exécution des scripts SQL compensatoires ou restauration PITR Supabase. |
| **Communication Familles/Écoles** | Direction / Support | Message d'incident si indisponibilité > 15 minutes. |

---

## 2. Retour Arrière Applicatif (Vercel)

L'application tourne sur **Vercel**. Un retour arrière applicatif prend **moins de 60 secondes** :

1. **Rollback instantané (Interface Vercel)** :
   - Rendez-vous sur [Vercel Dashboard](https://vercel.com) → Projet `educom-saas` → Onglet **Deployments**.
   - Repérez le déploiement stable précédent (ex: commit `5991754` du 9 septembre).
   - Cliquez sur les trois points `...` → **Instant Rollback** (ou **Promote to Production**).
   - *Effet immédiat* : Le trafic utilisateur bascule instantanément sur les artefacts de l'ancienne version sans délai de build.

2. **Retour arrière Git (Local / Repo)** :
   - Si un commit défectueux a été poussé sur `main` :
   ```bash
   git revert HEAD --no-edit
   git push origin main
   ```

---

## 3. Retour Arrière Base de Données (Prisma / Supabase)

⚠️ **Rappel fondamental** : Prisma Migrate n'a pas de commande `migrate down` automatique. Le rollback de schéma s'opère soit par **script SQL compensatoire**, soit par **restauration PITR**.

### Cas A : Annulation d'une migration spécifique (Compensatoire)
Si la migration a ajouté des colonnes ou tables (ex: `DocumentSequence`, `invoiceNumber`, `receiptNumber`), ces champs sont `NULLABLE` et rétro-compatibles :
- **L'ancien code fonctionne même si les colonnes existent** (non-bloquant).
- Si une suppression stricte est requise :
  ```bash
  # Appliquer un script SQL inverse via psql ou le SQL Editor Supabase
  # Exemple :
  # ALTER TABLE "Invoice" DROP COLUMN IF EXISTS "invoiceNumber";
  # DROP TABLE IF EXISTS "DocumentSequence";
  ```
- Mettre à jour la table des migrations :
  ```sql
  DELETE FROM _prisma_migrations WHERE migration_name = '20260916200000_sequential_invoice_receipt_numbering';
  ```

### Cas B : Corruption majeure de données (Restauration PITR Supabase)
En cas de perte ou corruption de données :
1. Se connecter à la console [Supabase](https://supabase.com/dashboard/project/slqjdyfdzvuqjxegojwu) → **Database** → **Backups**.
2. Utiliser **Point-in-Time Recovery (PITR)** :
   - Sélectionner l'horodatage exact 5 minutes avant le déploiement défectueux.
   - Valider la restauration vers une nouvelle instance ou restaurer l'instance active.

---

## 4. Checklist Post-Rollback

- [ ] Vérifier que `https://educom.school` répond en HTTP 200.
- [ ] Tester le parcours critique : Connexion direction (`/login`) → Tableau de bord (`/dashboard`).
- [ ] Vérifier que les variables d'environnement Vercel (`NEXT_PUBLIC_SITE_URL`, `DATABASE_URL`) sont intactes.
- [ ] Consigner l'incident et la cause racine dans `context.md`.
