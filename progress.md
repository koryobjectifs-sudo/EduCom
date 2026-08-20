# EduCom — Avancement

> Dernière mise à jour : 20 août 2026 — C.3 clôturé
> Ce fichier suit l'avancement des chantiers. Le détail technique, les décisions
> et les réserves vivent dans `rappel.md` ; la mémoire du projet dans `context.md`.

---

## GLOBAL

```
████████████████░░░░  78 %
```

| | Chantier | État |
|---|---|---|
| 🟢 | **B1** — Git / hygiène | TERMINÉ |
| 🟢 | **B2** — Sécurité / suppression du prestataire abandonné | TERMINÉ |
| 🟢 | **B3** — Build portable | TERMINÉ |
| 🟢 | **B4** — Secrets | TERMINÉ |
| 🔵 | **C** — Production Vercel | EN COURS |
| ⚪ | **D** — Domaine + Auth/SMTP | EN ATTENTE |
| ⚪ | **E** — Sécurité de production | EN ATTENTE |
| ⚪ | **F** — Wave : abonnements EduCom | EN ATTENTE |
| ⚪ | **G** — Tests réels | EN ATTENTE |
| ⚪ | **H** — Audit d'avant-lancement | EN ATTENTE |
| ⚪ | 🚀 **Lancement** | EN ATTENTE |

---

## C — PRODUCTION VERCEL

```
██████████████░░░░░░  70 %
```

> 🟢 **C.3 — Fondation de production : DONE.** Rotation du secret vérifiée,
> garde-fous actifs, aucune donnée métier modifiée.

| Étape | État |
|---|---|
| C.1 — Préparation du dépôt (build, cron, `distDir`) | 🟢 TERMINÉ |
| **C.2 — Audit Supabase développement / production** | 🟢 **TERMINÉ — audit livré** |
| **C.3 — Fondation de production** | 🟢 **DONE** |
| C.4 — Déploiement Vercel | ⚪ EN ATTENTE |

### C.3 — Finalisation · **100 %** · 🟢 **DONE**

| # | Contrôle | État |
|---|---|---|
| C.3.1 | Rotation du secret vérifiée | 🟢 PASS |
| C.3.2 | `DATABASE_URL` vérifiée | 🟢 PASS |
| C.3.3 | `DIRECT_URL` vérifiée | 🟢 PASS |
| C.3.4 | Ancien secret absent du dépôt **et de l'historique** | 🟢 PASS — 0 / 0 |
| C.3.5 | Garde-fous production vérifiés | 🟢 PASS — 23/23 + 8 cas réels |
| C.3.6 | Aucun changement de données métier | 🟢 PASS |
| C.3.7 | Non-régression | 🟢 PASS |
| C.3.8 | `rappel.md` | 🟢 §98 → §102 |
| C.3.9 | `progress.md` | 🟢 ce fichier |
| C.3.10 | **C.3 DONE** | 🟢 |

**Trois défauts trouvés pendant la clôture, tous corrigés :**

1. ⚠️ **La rotation avait fait sauter `sslmode`** — les deux connexions
   repassaient **en clair**. Prouvé par un témoin, corrigé : **TLS 1.3** rétabli.
2. ⚠️ **Le serveur `next dev` tournait encore avec l'ancien mot de passe** — toutes
   les pages du tableau de bord en 500, et le coupe-circuit Supabase déclenché.
   Redémarré ; sondes revenues à leur référence.
3. ⚠️ **`db pull` avait réécrit `schema.prisma`** et perdu 15 commentaires, pour
   zéro changement de modèle (vérifié dans les deux sens). Restauré.

**Reste ouvert, sans blocage pour C.3 :**

- ⃠ `CRON_SECRET` « bon secret → 200 » : NON PROUVÉ (basculerait une vraie facture).
- ⚠️ Résidus de fixtures `SONDE15` / `SONDEMOB` dans « Kory Academy 2 »
  (5 comptes, 3 classes, 7 documents). **Non supprimés — ce chantier l'interdit.**
- ⚠️ Le nouveau mot de passe a circulé en clair avant la correction du `sslmode` :
  re-rotation à décider.

### C.2 — ce qui est réellement terminé

- Projet Supabase actuel audité : **un seul projet**, référence `vuvjtc…id`,
  région **eu-west-1**, PostgreSQL 17.6.
- Inventaire des données : **3 écoles, 136 élèves, 10 comptes Auth, 1 bucket**.
  Réel / test / sonde / historique distingués (`rappel.md` §85).
- RLS relevé sur les **34 tables** : activé partout, **0 policy**.
- Rôle de connexion de l'application identifié : `postgres`, **`bypassrls = true`**.
- **14 vérificateurs** qui écrivent et suppriment recensés — **aucun n'avait de
  garde-fou**.
- 🟢 **Garde-fou de production posé et éprouvé** : un script visant le projet
  déclaré production est **refusé** avant toute écriture.
- Variables Vercel documentées (`rappel.md` §83), garde-fou compris.
- Non-régression complète relancée : **aucune régression**.

### Non prouvé

- ⃠ **L'inscription publique de bout en bout** par une personne extérieure
  (`verify-pilote-auth`) — inchangé, dépend de l'envoi d'e-mails réel.
- ⃠ **Aucun envoi d'e-mail réel n'a été testé.** Resend n'est ni installé ni
  configuré : le SMTP de production n'existe aujourd'hui que comme décision.
- ⃠ **Aucune sauvegarde vérifiée**, aucune restauration essayée.
- ⃠ **Le plan Supabase du projet n'a pas pu être lu** (rétention, PITR) : cela
  demande l'accès au tableau de bord.

### Décisions nécessaires — propriétaire uniquement

1. **Projet Supabase de production séparé** — recommandé (`rappel.md` §84).
2. **Sort des données actuelles** : « Kory Academy 2 » (133 élèves réels)
   devient-elle une école de production, ou reste-t-elle en développement ?
3. **Domaine** — bloque `NEXT_PUBLIC_SITE_URL` et tout le SMTP.
4. **Resend** : validation, et domaine d'envoi.
5. **Région** du projet de production.

### Bloquants

| Bloquant | Dépend de |
|---|---|
| Domaine non choisi | Kory |
| SMTP de production (Resend) non configuré | domaine |
| Projet Supabase de production inexistant | décision §84 |
| Mot de passe de la base à changer | Kory (voir `rappel.md` §86) |
| Clé Google à révoquer | Kory (`rappel.md` §70) |
| Documentation de l'API Wave | Kory (`rappel.md` §73) |

### Recommandation

**Deux projets Supabase distincts** (option B), et **ne pas promouvoir le projet
actuel en production**. Raisons détaillées en §84 : il a servi de bac à sable
pendant six jours, 14 scripts y créent et suppriment des données, et son mot de
passe a circulé.

### Prochain chantier

**C.4 — Environnement production** : projet Supabase de production, migrations
versionnées, secrets, Vercel, domaine, HTTPS, Auth et SMTP de production, URLs
de redirection, Cron, tests. ⚠️ **Non commencé.** Il attend le domaine et la
décision sur le projet Supabase de production (§84).

---

## Référence des tests — au 19 août 2026

| Vérificateur | Référence | Dernier relevé |
|---|---|---|
| PLG runtime | 80/80 | ✅ 80/80 (+1 non prouvé) |
| Landing runtime | 64/64 | ✅ 64/64 |
| RLS | 48/48 | ✅ 48/48 |
| Isolation locative | 62/62 | ✅ conforme |
| Responsive | 29/29 | ✅ 29/29 |
| Lot 17 (diffusion) | 91/91 | ✅ 91/91 |
| Lot 16 | 85/85 | ✅ 85/85 |
| Lot 15 | 75/75 | ✅ 75/75 |
| Lot 14 | 70/70 | ✅ 70/70 |
| Lot 13.1 | 67/67 | ✅ 67/67 |
| Auth pilote | 62/62 | ✅ 62/62 (+1 non prouvé) |
| Intégrations | 24/24 | ✅ 24/24 |
| `.env.example` | 12/12 | ✅ 12/12 |
| `verify-foundations` | **5 échecs historiques** | ✅ 5 — inchangés |
| `tsc --noEmit` | 0 erreur | ✅ 0 |
| `next build` | compile | ✅ compilé |

⚠️ **`verify-lot-12-2` : 4 échecs** — « Kory Academy 2 » ne contient aucun compte
`OWNER`. **État de données, pas régression** (`rappel.md` §79).
