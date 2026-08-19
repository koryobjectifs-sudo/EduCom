import { Fraunces } from "next/font/google";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

/**
 * Typographie d'affichage des surfaces publiques — addendum PLG.
 *
 * ═══ POURQUOI UNE SECONDE FAMILLE, ET POURQUOI CELLE-CI ═══
 *
 * Toute la page d'accueil était composée en Inter, y compris les titres. Inter
 * est un excellent caractère d'interface — c'est justement le problème : c'est
 * le caractère par défaut de tout le monde, et une page entièrement composée
 * dans la police de son propre tableau de bord n'a pas de voix.
 *
 * Fraunces n'est pas choisie pour « faire joli ». EduCom fabrique des
 * **documents officiels** : certificats, bulletins, reçus, attestations
 * d'inspection. Ces objets sont composés en romain depuis toujours, et une
 * famille à empattements sur les titres relie visuellement la page au livrable
 * — c'est la même promesse, dite deux fois.
 *
 * ⚠️ Elle est **cantonnée aux titres des pages publiques**. Le texte courant
 * reste en Inter, et le produit n'est pas touché : un tableau de notes ne se lit
 * pas en romain de labeur.
 *
 * ⚠️ Deux graisses seulement (600, 700). Une famille variable complète pèse
 * plusieurs centaines de kilo-octets ; la page d'accueil doit s'ouvrir depuis
 * Dakar sur une connexion mobile.
 */
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
  variable: "--font-fraunces",
});

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${fraunces.variable} flex min-h-screen flex-col bg-m-paper text-m-ink-soft`}>
      <Navbar />
      <main className="flex-grow">{children}</main>
      <Footer />
    </div>
  );
}
