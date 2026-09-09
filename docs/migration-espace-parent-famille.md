# Étude d'Architecture & Chiffrage : Migration de l'Espace Parent vers `/famille`

## 1. Diagnostic de l'existant
Actuellement, l'espace parent cohabite sous `/dashboard/*` avec une liste blanche stricte (`ROLE_PERMISSIONS.PARENT` en mode fail-closed `$`) et des composants dédiés (`ParentPaymentsView.tsx`, `ParentAccountView.tsx`, `ParentLayout.tsx`).
Bien que sécurisé côté serveur, le partage du préfixe `/dashboard` impose une maintenance de règles pour éviter tout chevauchement avec les outils d'administration scolaire.

## 2. Architecture cible proposée : `/famille`
- **Préfixe dédié racine** : `/famille` (ex: `/famille/enfants`, `/famille/dossiers`, `/famille/notes`, `/famille/paiements`, `/famille/compte`).
- **Layout & Shell 100% isolés** : `src/app/famille/layout.tsx` avec barre inférieure mobile native, sans aucun code d'administration ni concept de sidebar multi-rôles.
- **Règle de sécurité globale** :
  - `PARENT` : Accès à `/famille/*`, **accès à `/dashboard` bloqué en bloc (0 exception)**.
  - Rôles Équipe (`OWNER`, `ADMIN`, `SECRETARY`, `TEACHER`, `ACCOUNTANT`, `ASSISTANT`) : Accès à `/dashboard/*`, redirection si tentative sur `/famille`.

## 3. Plan de migration & Tâches
1. **Routing & Arborescence (`src/app/famille/`)** :
   - `src/app/famille/page.tsx` $\rightarrow$ Accueil famille / enfants
   - `src/app/famille/enfants/[id]/page.tsx` $\rightarrow$ Fiche enfant épurée
   - `src/app/famille/documents/page.tsx` $\rightarrow$ Documents & pièces d'admission
   - `src/app/famille/notes/page.tsx` $\rightarrow$ Bulletins & évaluations
   - `src/app/famille/paiements/page.tsx` $\rightarrow$ Solde, échéances & reçus
   - `src/app/famille/compte/page.tsx` $\rightarrow$ Profil parent & contact école
2. **Permissions (`src/lib/permissions.ts`)** :
   - `ROLE_PERMISSIONS.PARENT = ["/famille"]`
   - `ROLE_DENIALS.PARENT = ["/dashboard"]`
   - Suppression complète des listes noires de sous-chemins sous `/dashboard`.
3. **Redirections & Liens externes (SMS/WhatsApp)** :
   - Mise à jour des liens générés dans les notifications et SMS (`/famille/enfants/...`).
   - Redirection 308 des anciennes URL `/dashboard/payments` pour les sessions parent.

## 4. Estimation de charge & Coût
- **Création du route group `/famille` & transfert des vues dédiées** : 0.5 jour
- **Nettoyage radical des permissions et tests unitaires** : 0.25 jour
- **Tests d'isolation E2E et validation mobile** : 0.25 jour
- **Total estimé** : **1 jour homme**
- **Risque de régression** : Très faible (code déjà encapsulé dans `ParentPaymentsView` et `ParentAccountView`).
