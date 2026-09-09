# Analyse d'Infrastructure : Trajet Dakar ↔ Francfort & Latence Perçue

> Note technique pour arbitrage — Septembre 2026

## 1. Latence estimée Dakar → Francfort
- **Aller-retour physique (RTT fibre sous-marine) :** ~90 ms à 140 ms selon l'opérateur (Orange / Free Sénégal via câbles ACE / 2Africa).
- **Réseau mobile 3G/4G local :** +30 ms à 80 ms de gigue / latence radio locale.
- **RTT perçu par requête HTTP simple :** **~130 ms à 220 ms**.

## 2. Coût concret sur une navigation type
- **Sans SSR optimisé / avec cascades de requêtes :**
  - Si le navigateur ou le serveur fait 10 allers-retours successifs : $10 \times 150\text{ ms} = \mathbf{1{,}5\text{ s}}$ d'attente incompressible.
- **Avec SSR colocalisé (Vercel `fra1` + Supabase `fra1`) :**
  - L'ensemble des 10 à 30 requêtes SQL s'exécutent en réseau local à Francfort (< 2 ms par requête).
  - Le client sénégalais ne paie **qu'un seul aller-retour HTTP** pour recevoir le HTML complet ($1 \times 150\text{ ms}$).

## 3. Options d'infrastructure & arbitrage

| Option | Gain estimé | Faisabilité / Coût |
| :--- | :--- | :--- |
| **A. Colocalisation Vercel `fra1` + Supabase `fra1`** *(recommandé)* | Supprime la latence inter-serveur (< 2ms SQL). 1 seul RTT Dakar-Francfort par page. | Immédiat, inclus dans le plan actuel ($0). |
| **B. Région Afrique de l'Ouest (Supabase / AWS)** | Réduit le RTT à ~20-40 ms. | AWS n'a pas de région à Dakar (la plus proche est Le Cap `af-south-1` ~140ms via Europe). Non pertinent. |
| **C. Cache Edge (Vercel Edge Network / CDN)** | Réponse en < 30 ms depuis un PoP Afrique (ex: Dakar/Lagos). | Gratuit, mais **strictement restreint** aux assets et référentiels publics. |
| **D. Read Replicas distribués** | Lecture locale rapide. | Coût élevé ($$$), complexité de synchronisation multi-tenant inutile au stade actuel. |

## 4. Frontière stricte de sécurité & données mineurs (RGPD / Droit sénégalais)
- **INTERDICTION FORMELLE DE CACHE EN PÉRIPHÉRIE (EDGE/CDN) :**
  - Noms, prénoms, dates de naissance, coordonnées des élèves mineurs et parents.
  - Bulletins, notes, évaluations, attestations.
  - Factures, montants dus, historiques de paiement.
  - *Toute donnée nominative ou financière doit rester rendue dynamiquement et scellée par `schoolId`.*
## 5. Dimensionnement du Pool Prisma (`connection_limit=5`)
- **Configuration active :** `connection_limit=5` sur l'URL du pooler transactionnel (port `6543`).
- **Prérequis Plan Supabase :**
  - **Plan Pro ($25/mois) :** Le pooler Supabase (Supavisor) supporte jusqu'à **2 000 connexions clientes simultanées**. Avec 5 connexions par conteneur serverless, 30 conteneurs en pic consomment 150 connexions pooler (marge de 92%).
  - **Plan Free :** Le pooler est bridé à **200 connexions clientes**. À 5 connexions/instance, la saturation est atteinte dès 40 instances simultanées. Sur un plan Free, réduire à `connection_limit=2` ou `3`.
