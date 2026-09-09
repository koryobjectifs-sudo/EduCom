# Configuration Sécurité Supabase Auth

## Avertissement sur les Jokers (Wildcards)
**Règle absolue :** Ne jamais utiliser de jokers (`*`) dans les Redirect URLs de Supabase en production, en particulier `https://*.vercel.app/auth/callback`. Cela permettrait à n'importe quel autre projet Vercel malveillant d'intercepter les tokens d'authentification de vos utilisateurs.

## Liste EXACTE des Redirect URLs à déclarer (Sans Joker)

Côté **Supabase (Authentication > URL Configuration)**, seules ces URL explicites doivent être déclarées dans la liste "Redirect URLs" :

### 1. Production (Obligatoire)
- `https://educom.sn/auth/callback`

### 2. Développement (À retirer en production)
Ces URL ne servent qu'au développement et aux tests locaux. **Elles doivent être supprimées de l'interface Supabase avant l'ouverture au public.**
- `http://localhost:3000/auth/callback`
- `http://192.168.1.5:3000/auth/callback` (Votre IP tablette locale)

### 3. Prévisualisation Vercel (Staging)
Puisque le joker `*` est interdit, si vous testez sur une URL de prévisualisation Vercel, vous devez ajouter **l'URL exacte** générée par Vercel pour cette branche/déploiement. Par exemple :
- `https://educom-saas-git-main-votre-equipe.vercel.app/auth/callback`
(Remplacez par l'URL exacte donnée par Vercel pour votre environnement de staging).

## Configuration Google Cloud Console
Côté Google (Identifiants OAuth), le bouton de connexion passe exclusivement par le serveur de Supabase. Il n'y a donc qu'une seule URL à déclarer dans "Authorized redirect URIs" :
- `https://slqjdyfdzvuqjxegojwu.supabase.co/auth/v1/callback`
