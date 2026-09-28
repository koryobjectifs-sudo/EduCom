"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireActionContext } from "@/lib/actionContext";
import { abonnementEcole, PRO_PRICE_XOF } from "@/lib/subscription";
import { calculerTarifAbonnement, STANDARD_PRICE_XOF, PREMIUM_PRICE_XOF } from "@/lib/pricing";
import { creerSessionWave, waveConfigure } from "@/lib/wave";

const PATH = "/dashboard/abonnement";
/** Durées proposées avec remises dégressives (1, 3, 6, 12 mois). */
const DUREES = [1, 3, 6, 12] as const;

async function origine(): Promise<string> {
  const configuree = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configuree && configuree.startsWith("https://")) return configuree.replace(/\/$/, "");
  const h = await headers();
  const hote = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto");
  if (proto === "https" && hote) return `https://${hote}`;
  // Wave exige impérativement le protocole HTTPS pour success_url et error_url.
  // En local (HTTP), on bascule sur l'adresse officielle pour permettre l'ouverture de la session.
  return "https://www.educom.school";
}

/**
 * Ouvre une session de paiement Wave pour l'abonnement de l'école.
 *
 * Réservé à `OWNER` / `ADMIN` (`hasAccess` : aucun autre rôle ne liste
 * `/dashboard/abonnement`). Le montant est calculé ICI, jamais reçu du client :
 * seul le nombre de mois et la formule viennent du navigateur.
 */
export async function payerAbonnement(
  mois: number,
  formule: "STANDARD" | "PREMIUM" = "PREMIUM",
): Promise<{ url: string } | { error: string }> {
  const auth = await requireActionContext(PATH);
  if (!auth.ok) return { error: auth.error };
  if (!DUREES.includes(mois as (typeof DUREES)[number])) return { error: "Durée non proposée." };
  if (!waveConfigure()) {
    return { error: "Le paiement Wave n'est pas encore activé sur EduCom. Réessayez plus tard ou écrivez-nous." };
  }

  const { schoolId, userId } = auth.ctx;
  const sub = await abonnementEcole(schoolId);
  const prixMensuel = formule === "STANDARD" ? STANDARD_PRICE_XOF : PREMIUM_PRICE_XOF;
  const { total } = calculerTarifAbonnement(prixMensuel, mois);
  const montant = total;
  const reference = `ABO-${randomUUID()}`;

  // Mettre à jour l'offre souhaitée
  await prisma.schoolSubscription.update({
    where: { id: sub.id },
    data: { plan: formule },
  });

  const paiement = await prisma.subscriptionPayment.create({
    data: {
      schoolId,
      subscriptionId: sub.id,
      amountXof: montant,
      months: mois,
      clientReference: reference,
      initiatedBy: userId,
    },
  });

  try {
    const base = await origine();
    const session = await creerSessionWave({
      montantXof: montant,
      reference,
      urlSucces: `${base}${PATH}?paiement=retour`,
      urlEchec: `${base}${PATH}?paiement=echec`,
    });
    await prisma.subscriptionPayment.update({
      where: { id: paiement.id },
      data: { checkoutSessionId: session.id },
    });
    return { url: session.wave_launch_url };
  } catch (e) {
    console.error("[abonnement] ouverture de session Wave impossible", e);
    await prisma.subscriptionPayment.update({ where: { id: paiement.id }, data: { status: "ECHEC" } });
    return { error: "Wave n'a pas pu ouvrir le paiement. Réessayez dans un instant." };
  }
}
