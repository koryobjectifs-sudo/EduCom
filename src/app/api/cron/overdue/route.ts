import { NextRequest, NextResponse } from "next/server";
import { sweepAllSchools } from "@/lib/overdue";

/**
 * Point d'entrée pour un ordonnanceur externe — bascule des factures échues.
 *
 * ═══ POURQUOI UN GESTIONNAIRE DE ROUTE ═══
 *
 * Le dépôt n'a aucune infrastructure de tâches : appeler une logique serveur par
 * HTTP n'ajoute **aucune dépendance à un service externe**, et n'importe quel
 * ordonnanceur convient — Cron Vercel, `crontab` sur un VPS, une tâche Supabase.
 *
 * ⚠️ **C'est désormais la SEULE route d'API du projet.** Les deux webhooks qui
 * lui servaient de précédent ont été supprimés le 19 août 2026 parce qu'ils
 * étaient ouverts : l'échec fermé décrit ci-dessous n'est donc plus un motif
 * parmi d'autres, c'est le seul modèle admis pour toute route à venir.
 *
 * ═══ ÉCHEC FERMÉ ═══
 *
 * ⚠️ Sans `CRON_SECRET` dans l'environnement, la route **refuse tout**. C'est
 * délibéré : une route de traitement de masse ouverte par défaut serait pire que
 * l'absence de route. Elle est donc inerte tant que le secret n'est pas défini,
 * et le message le dit clairement dans les journaux du serveur.
 *
 * La comparaison est de longueur constante pour ne pas laisser fuir le secret
 * caractère par caractère.
 *
 * ═══ MISE EN PLACE ═══
 *
 *   1. définir `CRON_SECRET` (valeur aléatoire longue) ;
 *   2. planifier un appel quotidien :
 *        curl -X POST https://<hôte>/api/cron/overdue \
 *             -H "Authorization: Bearer $CRON_SECRET"
 *
 * Une fréquence quotidienne suffit : les écrans dérivent le retard de `dueDate`
 * entre deux passages, donc un balayage manqué ne fausse aucun affichage.
 */

export const dynamic = "force-dynamic";

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function authorise(req: NextRequest): { ok: true } | { ok: false; status: number; message: string } {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron/overdue] CRON_SECRET absent — la route reste inerte.");
    return { ok: false, status: 503, message: "Tâche non configurée." };
  }

  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token || !timingSafeEqual(token, secret)) {
    return { ok: false, status: 401, message: "Non autorisé." };
  }
  return { ok: true };
}

async function balayer(req: NextRequest) {
  const auth = authorise(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const results = await sweepAllSchools();
    const changed = results.reduce((s, r) => s + r.changed, 0);
    console.log(`[cron/overdue] ${changed} facture(s) basculée(s) sur ${results.length} établissement(s).`);
    // Aucun identifiant de facture ni nom d'école dans la réponse : elle sort de
    // l'application, et un décompte suffit à l'ordonnanceur.
    return NextResponse.json({ schools: results.length, changed });
  } catch (error) {
    console.error("[cron/overdue] échec du balayage :", error);
    return NextResponse.json({ error: "Le balayage a échoué." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return balayer(req);
}

/**
 * `GET` accepté — **mais soumis au même secret**.
 *
 * ═══ POURQUOI CE VERBE A CHANGÉ, ET POURQUOI CE N'EST PAS UN RELÂCHEMENT ═══
 *
 * `GET` était refusé, avec ce motif : « un traitement qui écrit ne doit pas être
 * déclenché par une simple visite ». Le motif reste juste ; ce qui a changé,
 * c'est l'ordonnanceur retenu.
 *
 * ⚠️ **Vercel Cron appelle ses tâches en `GET`.** Une route qui ne répond qu'en
 * `POST` aurait donc renvoyé 405 à chaque exécution planifiée — c'est-à-dire une
 * tâche qui échoue tous les jours en silence, et des factures qui ne basculent
 * jamais en retard. Exactement la famille de panne que ce projet passe son temps
 * à corriger : quelque chose qui a l'air branché et ne l'est pas.
 *
 * **La protection est intégralement conservée** : `authorise()` est appelée en
 * premier, et exige `Authorization: Bearer $CRON_SECRET` comparé à durée
 * constante. Une « simple visite » de navigateur ne porte pas cet en-tête et
 * reçoit 401 ; sans `CRON_SECRET` dans l'environnement, la route reste inerte
 * (503). Vercel ajoute cet en-tête automatiquement dès que `CRON_SECRET` est
 * défini dans les variables du projet — le contrat coïncide exactement.
 *
 * ⚠️ `export const dynamic = "force-dynamic"` (plus haut) est ce qui empêche ce
 * `GET` d'être mis en cache : sans lui, un CDN pourrait servir la réponse d'un
 * balayage précédent et masquer les exécutions suivantes.
 */
export async function GET(req: NextRequest) {
  return balayer(req);
}
