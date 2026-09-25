import { Instrument_Sans, Libre_Caslon_Text } from "next/font/google";
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

/**
 * Police du logo EduCom — 24 septembre 2026 (Kory : « appliquer la police
 * d'EduCom sur la page »). Libre Caslon Text, la plus proche du logo (romain à
 * empattements, voir `EduComWordmark`). Elle porte le mot « EduCom » ET tous
 * les titres des pages publiques, via la règle `[data-marketing] .font-display`
 * de `globals.css` (le thème est `@theme inline` : redéfinir `--font-display`
 * sur le conteneur n'aurait AUCUN effet, l'utilitaire porte la valeur en dur).
 * Seules les pages publiques changent ; le tableau de bord n'est pas touché.
 *
 * Le texte courant reste en linéale : un romain en petit corps sur téléphone
 * se lit moins bien, et c'est l'usage des marques institutionnelles.
 */
const wordmark = Libre_Caslon_Text({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-wordmark",
});

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      data-marketing
      className={`${instrument.variable} ${wordmark.variable} flex min-h-screen flex-col bg-m-paper text-m-ink-soft`}
    >
      <Navbar />
      <main className="flex-grow pt-14">{children}</main>
      <Footer />
    </div>
  );
}
