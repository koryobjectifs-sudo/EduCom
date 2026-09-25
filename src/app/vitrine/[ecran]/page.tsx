import type { Metadata } from "next";
import { notFound } from "next/navigation";
import VitrineEcran from "../VitrineEcran";
import { ECRANS_VITRINE, type EcranVitrine } from "../ecrans";

/**
 * Écrans RÉELS d'EduCom pour la vitrine mobile de la landing — 25 sept. 2026.
 *
 * Kory : « être fidèle aux fonctionnalités déjà créées, importer ce qui existe,
 * ne rien inventer ». Cette route rend les VRAIS composants du produit
 * (`SecondaireTable`, `TakeAttendanceClient`, `AvatarPhoto`, `ScanDialog`,
 * `FamillesClient`, barre du bas `MobileTabBar`…) avec des données d'exemple,
 * sans base ni session. `MobileShowcase` l'affiche dans un <iframe> de largeur
 * téléphone : les points de rupture `sm:`/`lg:` jouent donc exactement comme
 * sur un vrai téléphone.
 *
 * ⚠️ Aucune donnée réelle : tout vient de `VitrineEcran.tsx`. Depuis le
 * 25 sept., l'écran est INTERACTIF : `VitrineEcran` intercepte les liens
 * (écran de vitrine ou fiche « dans votre espace »), les envois de formulaire
 * et les server actions (bloqués avant le réseau), `print` et `open`. Les
 * actions restent de toute façon refusées côté serveur (aucune session).
 * Non indexée.
 */
export const metadata: Metadata = {
  title: "EduCom — aperçu",
  robots: { index: false, follow: false },
};

export function generateStaticParams() {
  return ECRANS_VITRINE.map((ecran) => ({ ecran }));
}

export default async function Page({ params }: { params: Promise<{ ecran: string }> }) {
  const { ecran } = await params;
  if (!ECRANS_VITRINE.includes(ecran as EcranVitrine)) notFound();
  return <VitrineEcran ecran={ecran as EcranVitrine} />;
}
