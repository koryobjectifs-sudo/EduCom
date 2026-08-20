# Migrations — passage de `db push` à des migrations versionnées

> Préparé le 19 août 2026 (C.3). **Aucune migration n'a été appliquée à ce jour :
> la table `_prisma_migrations` est ABSENTE de la base de développement.**

## Pourquoi ce changement est nécessaire

Le projet a vécu jusqu'ici sous `prisma db push` : le schéma est poussé
directement, sans trace de ce qui a changé ni quand. Tant qu'une seule base
existe, cela fonctionne.

⚠️ **Avec deux environnements, `db push` devient un piège.** Rien ne garantit que
la production ait reçu la même modification que le développement. Une colonne
ajoutée en dev et oubliée en production, et l'application plante en production
sur une colonne absente — sans que rien, dans le dépôt, ne permette de le voir
venir. C'est le risque principal de l'option « deux projets » (`rappel.md` §84).

## Ce qui a été préparé

`00000000000000_baseline/migration.sql` — **1040 lignes**, générées par
`prisma migrate diff --from-empty`, décrivant le schéma complet :
34 tables, 20 types énumérés, 71 index, 9 index uniques, 62 contraintes.

**Vérifié : 0 instruction destructive.** Aucun `DROP`, `TRUNCATE` ni `DELETE`.
Le fichier ne fait que créer.

**Vérifié : la base actuelle correspond exactement au schéma.** Le diff entre la
base de développement et `schema.prisma` est **vide** — la ligne de référence
décrit donc fidèlement ce qui existe.

## Ce qu'il reste à faire — et pourquoi ce n'est pas fait

### Sur la base de développement existante : *baseliner*

⚠️ **Ne JAMAIS exécuter ce `migration.sql` sur la base de développement.** Ses
tables existent déjà : il échouerait, et le rejouer de force détruirait des
données. Il faut le déclarer *déjà appliqué* :

```bash
npx prisma migrate resolve --applied 00000000000000_baseline
```

Cette commande **n'exécute aucun SQL** : elle crée `_prisma_migrations` et y
inscrit la ligne de référence comme appliquée.

**Pourquoi ce n'est pas fait ici :** la même ligne de référence doit être posée
sur les deux environnements, et **le projet de production n'existe pas encore**.
Baseliner le développement seul créerait un décalage d'historique entre deux
bases censées partager le même. La commande est prête ; elle sera jouée sur les
deux à la suite, une fois le projet de production créé.

### Sur la future base de production : *appliquer*

Une base **neuve et vide** reçoit la ligne de référence normalement :

```bash
npx prisma migrate deploy
```

`deploy` n'invente rien et ne réinitialise rien : il applique les migrations
manquantes, dans l'ordre. C'est la seule commande admise en production.

## Règles à tenir ensuite

1. **Plus jamais `db push` sur la production.** Pas même « juste une colonne ».
2. En développement : `npx prisma migrate dev --name <ce-qui-change>` — le nom
   est lu par un humain dans six mois, il doit dire *quoi*, pas *quand*.
3. Chaque migration est **committée avec le code qui en dépend**. Une migration
   sans son code, ou l'inverse, casse un des deux environnements.
4. ⚠️ **Ne jamais utiliser `prisma migrate reset`** : la commande *supprime toute
   la base*. Elle n'a aucun usage légitime ici.
5. Une migration qui supprime ou renomme une colonne se relit à deux, et se
   double d'une sauvegarde vérifiée (règle 4 d'`AGENTS.md`).
