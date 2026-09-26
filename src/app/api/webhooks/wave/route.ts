import { NextRequest, NextResponse } from "next/server";
import { verifierSignatureWave } from "@/lib/wave";
import { confirmerPaiementAbonnement } from "@/lib/subscription";

/**
 * Webhook Wave — abonnements EduCom UNIQUEMENT. 25 sept. 2026.
 *
 * ═══ ÉCHEC FERMÉ (modèle de `api/cron/overdue`) ═══
 * Sans `WAVE_WEBHOOK_SECRET`, la route refuse tout (503). Les deux anciens
 * webhooks du dépôt ont été supprimés le 19 août parce qu'ils étaient
 * ouverts : ici, rien ne s'exécute avant la vérification de signature.
 *
 * ═══ ORDRE ═══
 *  1. corps BRUT lu en texte (la signature porte sur l'octet près) ;
 *  2. signature HMAC + horodatage < 5 min (`verifierSignatureWave`) ;
 *  3. seulement ensuite `JSON.parse` ;
 *  4. le contenu du webhook n'est PAS cru : `confirmerPaiementAbonnement`
 *     relit la session chez Wave avec notre clé avant de prolonger quoi que
 *     ce soit, et ne prolonge qu'une fois (transaction conditionnelle).
 *
 * À déclarer dans le Wave Business Portal : https://<hôte>/api/webhooks/wave,
 * stratégie « Signing secret », évènements checkout.session.completed et
 * checkout.session.payment_failed.
 */
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const secret = process.env.WAVE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    console.error("[webhooks/wave] WAVE_WEBHOOK_SECRET absent — la route reste inerte.");
    return NextResponse.json({ error: "Webhook non configuré." }, { status: 503 });
  }

  const corps = await req.text();
  const refus = verifierSignatureWave(corps, req.headers.get("wave-signature"), secret);
  if (refus) {
    console.warn(`[webhooks/wave] refusé : ${refus}`);
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  let evenement: { type?: string; data?: { id?: string } };
  try {
    evenement = JSON.parse(corps);
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }

  const type = evenement.type ?? "";
  const sessionId = evenement.data?.id;
  if (!type.startsWith("checkout.session.") || !sessionId) {
    // Évènement non géré (ex. payout) : accusé de réception, rien d'autre.
    return NextResponse.json({ recu: true });
  }

  try {
    const resultat = await confirmerPaiementAbonnement(sessionId);
    return NextResponse.json({ recu: true, resultat });
  } catch (e) {
    // 500 : Wave réessaiera. Aucune donnée n'a été modifiée hors transaction.
    console.error("[webhooks/wave] confirmation impossible", e);
    return NextResponse.json({ error: "Traitement impossible, réessayez." }, { status: 500 });
  }
}
