import { Instrument_Sans } from "next/font/google";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

/**
 * Typographie d'affichage des surfaces publiques — refonte du 4 septembre
 * 2026 (troisième version, rejet explicite des deux précédentes).
 *
 * ═══ POURQUOI ENCORE UNE SECONDE FAMILLE, ET POURQUOI CELLE-CI ═══
 *
 * Toute la page d'accueil était composée en Inter, y compris les titres —
 * or Inter est le caractère du produit lui-même : une page entièrement
 * composée dans la police de son propre tableau de bord n'a pas de voix.
 * Une seconde famille reste donc nécessaire pour les titres.
 *
 * ⚠️ Ce n'est PLUS Fraunces. La tentative précédente choisissait un romain
 * d'affichage parce que la métaphore était le document officiel (certificat,
 * cachet). Cette refonte change de métaphore — EduCom comme système, pas
 * comme imprimerie (voir l'en-tête du socle marketing dans `globals.css`) —
 * et une linéale confiante raconte mieux « logiciel sérieux » qu'un romain.
 * Instrument Sans plutôt qu'Inter en plus gras : Inter en très grand corps
 * s'aplatit et ressemble exactement à... Inter en très grand corps. Une
 * famille distincte, à l'assise plus haute et plus resserrée, donne aux
 * titres une voix qu'un simple changement de graisse n'aurait pas.
 *
 * ⚠️ Cantonnée aux titres des pages publiques. Le texte courant reste en
 * Inter, et le produit n'est pas touché.
 *
 * ⚠️ Trois graisses seulement (500, 600, 700), pas la famille variable
 * complète : la page doit s'ouvrir vite depuis une connexion mobile à Dakar.
 */
const instrument = Instrument_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
  variable: "--font-instrument",
});

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${instrument.variable} flex min-h-screen flex-col bg-m-paper text-m-ink-soft`}>
      <Navbar />
      <main className="flex-grow">{children}</main>
      <Footer />
    </div>
  );
}
