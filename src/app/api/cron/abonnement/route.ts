import { NextRequest, NextResponse } from "next/server";
import { passerRelancesAbonnement } from "@/lib/subscription";
import { annoncerDistributionsEchues } from "@/lib/bulletinsParents";
import { annoncerSondagesEchus } from "@/lib/sondages";
import { publierProgrammesEchus } from "@/lib/programmes";
import { rappelerBilansDuVendredi } from "@/lib/bilanSemaine";

/**
 * Relances d'abonnement EduCom — tâche quotidienne. 25 sept. 2026.
 *
 * Même modèle que `api/cron/overdue` : ÉCHEC FERMÉ sans `CRON_SECRET`,
 * comparaison du jeton en temps constant. Idempotente : relancer la tâche
 * deux fois le même jour ne dépose pas deux fois la même relance.
 *
 *   curl -X POST https://<hôte>/api/cron/abonnement -H "Authorization: Bearer $CRON_SECRET"
 */
export const dynamic = "force-dynamic";

function egal(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron/abonnement] CRON_SECRET absent — la route reste inerte.");
    return NextResponse.json({ error: "Tâche non configurée." }, { status: 503 });
  }
  const entete = req.headers.get("authorization") ?? "";
  const jeton = entete.startsWith("Bearer ") ? entete.slice(7) : "";
  if (!jeton || !egal(jeton, secret)) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  const resultat = await passerRelancesAbonnement();
  // 26 sept. 2026 — même passage quotidien : bulletins dont la date de
  // distribution est arrivée → les familles sont prévenues (idempotent).
  const bulletins = await annoncerDistributionsEchues().catch((e) => {
    console.error("[cron] distributions de bulletins :", (e as Error).message);
    return 0;
  });
  // Sondages arrivés à leur date de clôture : résultats annoncés (idempotent).
  const sondages = await annoncerSondagesEchus().catch((e) => {
    console.error("[cron] résultats des sondages :", (e as Error).message);
    return 0;
  });
  const programmes = await publierProgrammesEchus().catch(() => 0);
  // Vendredi : rappel aux professeurs principaux d'envoyer le bilan de la semaine.
  const rappelsBilan = await rappelerBilansDuVendredi().catch(() => 0);
  return NextResponse.json({ ok: true, ...resultat, familles_prevenues_bulletins: bulletins, personnes_prevenues_sondages: sondages, messages_programmes_annonces: programmes, rappels_bilan: rappelsBilan });
}

/**
 * Vercel Cron appelle en `GET` (et envoie `Authorization: Bearer $CRON_SECRET`
 * quand la variable existe) : même garde, même traitement, jamais en cache.
 */
export async function GET(req: NextRequest) {
  return POST(req);
}
