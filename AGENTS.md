<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Règles du projet EduCom SaaS

> Ces règles s'appliquent à **tout agent** travaillant sur ce dépôt (Claude Code, Antigravity, Windsurf…).
> Elles vivent ici, à la racine, parce que c'est le seul emplacement lu par tous.
> Ne pas les déplacer dans `.agents/` : ce dossier n'est pas chargé par Claude Code.

## 1. Archivage obligatoire dans `context.md`

`context.md`, à la racine, est **la mémoire du projet**. C'est le fichier qui permet de reprendre le travail après une interruption, un changement d'outil ou un quota épuisé. Il n'est écrit par aucun automatisme : sa fiabilité dépend entièrement de cette règle.

**L'enregistrement est automatique et non négociable.** Je mets `context.md` à jour **de moi-même**, sans que l'utilisateur ait à le demander, avant de conclure dès que l'un de ces cas se produit :

- une fonctionnalité est livrée ou modifiée ;
- le schéma Prisma change, ou des données sont migrées / supprimées ;
- une décision d'architecture est arbitrée ;
- un bug significatif est trouvé ou corrigé ;
- un chantier est ouvert, refermé, ou change de priorité.

**Ce qu'il faut y consigner en priorité — ce que le code ne dit pas :**

1. **Les décisions et leur pourquoi.** Le code montre *ce qui* est fait ; il ne dit jamais *pourquoi* cette option a été retenue ni laquelle a été écartée.
2. **Les pièges rencontrés.** Contraintes non évidentes, comportements trompeurs, faux amis. Ils reviendront mordre quelqu'un.
3. **L'état réel de la base** pour le tenant de travail (comptages par table), car il ne se déduit pas du dépôt.
4. **Les chantiers ouverts, par ordre de priorité**, avec ce qui bloque chacun.
5. **Les idées « au chaud »**, pour pouvoir s'y référer plus tard.

**Ce qu'il ne faut PAS y mettre :** ce que le dépôt raconte déjà — arborescence, contenu des fichiers, historique Git. La note doit rester lisible en une fois.

**Tenir à jour l'en-tête `Dernière mise à jour`.** Le fichier est rédigé **en français** : garder la langue.

## 2. Règle absolue de débogage

1. **Aucune fausse promesse.** Ne jamais annoncer qu'un bug est corrigé sans l'avoir testé, compilé et vérifié. Ne pas deviner une correction sans s'assurer qu'elle est effective.
2. **Débogage complet.** Chercher la cause profonde, lire les messages d'erreur en entier, et vérifier que toutes les étapes nécessaires ont été faites (`npx prisma db push`, `npx tsc --noEmit`, redémarrage du serveur…).
3. **Prouver avant de parler.** Après une erreur de base de données (« The column does not exist »), s'assurer que le schéma a bien été poussé. La correction n'est annoncée qu'une fois la vérification terminée.
4. **Dire ce qui n'a pas été vérifié.** Si une partie n'a pas pu être testée (page derrière l'authentification, rendu visuel…), le signaler explicitement plutôt que de laisser croire à une validation complète.

## 3. Ne jamais lancer `next build` pendant que `next dev` tourne

Les deux écrivent dans le même dossier `.next`. Un `next build` de vérification écrase les artefacts du serveur de dev, qui se met alors à servir du code périmé — l'utilisateur ne voit plus ses modifications et croit que rien n'a été fait.

Pour vérifier une compilation sans casser la session : `npx tsc --noEmit`, plus la compilation à la demande du serveur de dev (consulter `.next/dev/logs/next-development.log`).

## 4. Opérations destructives sur la base

`Enrollment.classId` et `Grade.classId` sont en `onDelete: Cascade` : supprimer une classe **efface silencieusement** les inscriptions et les notes rattachées.

Avant toute suppression ou migration de données : compter ce qui est rattaché, faire une sauvegarde, proposer un **essai à blanc** (`APPLY=1` pour écrire), et n'appliquer qu'ensuite. Voir `scripts/merge-duplicate-classes.ts` comme modèle.

## 5. Constitution produit (Product-Led Design)

La **Product-Led Design Constitution** est installée globalement — elle s'applique à tous les projets de Kory, pas seulement à EduCom :

- Claude Code : `~/.claude/CLAUDE.md`
- Gemini CLI : `~/.gemini/GEMINI.md`
- Antigravity : `~/.gemini/config/AGENTS.md`

Le texte intégral vit là-bas ; il n'est **pas recopié ici** pour éviter deux versions qui divergent. Ce qui suit est le rappel opérationnel et son application à EduCom.

**Les quatre principes.** ① **Test des trois secondes** — chaque écran dit immédiatement ce qu'il est, à qui il s'adresse, ce qu'on peut y faire, quoi faire ensuite, et pourquoi s'y fier. ② **Point d'équilibre de la friction** — chaque clic, champ, écran, permission, réglage, confirmation doit justifier son existence ; le produit absorbe la complexité au lieu de l'exposer. ③ **Cartographie du WIN** — chaque parcours a un premier moment « ça m'est utile » ; on optimise le **temps jusqu'à la valeur**, pas le nombre de fonctionnalités. ④ **Design émotionnel** — l'utilisateur doit se sentir confiant, capable, organisé, compris ; feedback utile, bons états vides, microcopie, pas de gadget.

**Le PLG CHECK est obligatoire.** Si une demande entre en conflit avec ces principes, ne pas exécuter en silence : exposer *ce qui est demandé*, *le conflit*, *pourquoi ça compte*, *une meilleure approche*, puis demander s'il faut continuer. **Une fois que Kory a confirmé sa direction, l'exécuter sans y revenir.**

**Friction nécessaire = friction conservée.** Ce projet manipule des notes, des bulletins et de l'argent réels. Les garde-fous des règles 2 et 4 ci-dessus (essai à blanc, confirmation avant cascade, échec fermé du cron) sont de la friction **protectrice** : le principe ② ne les supprime jamais. Ne retirer que la friction qui sert l'implémentation, jamais celle qui protège l'utilisateur ou ses données.

**Les utilisateurs d'EduCom ne sont pas des utilisateurs de SaaS aguerris.** Directeurs, secrétaires, enseignants, comptables et parents d'établissements sénégalais. Le WIN doit arriver **avant** toute configuration complète : un enseignant doit pouvoir saisir des notes et voir un bulletin sans avoir paramétré l'école entière au préalable.

**Validation finale.** Avant de déclarer un écran terminé, vérifier les quatre principes. S'il fonctionne techniquement mais échoue au test, le dire et proposer l'amélioration **avant** d'annoncer que c'est fini — cohérent avec la règle 2 (« dire ce qui n'a pas été vérifié »).

## 6. Communication ultra-courte

**Ne faites jamais de textes kilométriques.** L'utilisateur souhaite des réponses extrêmement concises et directes. 
- Allez à l'essentiel en quelques lignes maximum.
- Donnez des étapes claires et chiffrées sans blabla.
- Posez vos questions de manière directe.

## 7. Vérifier l'information avant d'instruire

Avant de donner une instruction sur l'interface d'un logiciel externe (Supabase, Vercel, Resend, etc.), vérifiez l'information exacte et actuelle (via une recherche web par exemple). Ne donnez jamais d'indications basées sur des souvenirs potentiellement périmés.

## 8. Interdiction formelle de s'excuser

Ne présentez **jamais** d'excuses. Ne dites pas "désolé", "autant pour moi", ou "je m'excuse". Si une erreur est faite, corrigez-la immédiatement et avancez en donnant l'instruction correcte pour faire gagner du temps.

## 9. Interdiction d'exécuter sans accord si demandé

Quand l'utilisateur demande de ne rien faire et d'expliquer simplement (ou de ne pas exécuter), arrêtez-vous, expliquez, proposez un plan, et attendez explicitement son feu vert.

## 10. Performance au top (Batching)

La plateforme doit être extrêmement rapide et fluide. Pour toute opération massive (création en masse, importations de 500+ entités), n'utilisez jamais de requêtes séquentielles dans une boucle. Privilégiez systématiquement le batching (`createMany`, `createManyAndReturn`) pour réduire le nombre de requêtes à son strict minimum.
