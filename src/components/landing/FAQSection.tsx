import { ChevronDown } from "lucide-react";

/**
 * Questions fréquentes — addendum PLG.
 *
 * ═══ CE QUI ÉTAIT RÉPONDU, ET QUI ÉTAIT FAUX ═══
 *
 * ⚠️ « Le module de communication permet d'envoyer des annonces via le portail
 *    parent, **par SMS ou WhatsApp, avec suivi des accusés de lecture**. » Le
 *    lot 17 a prouvé qu'aucun canal ne peut émettre (`rappel.md` §30 à §32) ;
 *    l'accusé de lecture n'a jamais existé.
 * ⚠️ « Les parents **reçoivent un lien sécurisé** » — il n'existe aucun service
 *    d'e-mail pour l'envoyer.
 * ⚠️ « Notre plan **EduCom School** » — un nom de formule inventé, qui ne
 *    correspondait à aucune ligne de la grille tarifaire de la même page.
 * ⚠️ « Peut-on importer nos données existantes ? » — la réponse laissait croire
 *    que oui ; aucun import n'existe.
 *
 * ═══ CE QUI LES REMPLACE ═══
 *
 * Huit réponses exactes, **dont quatre disent non**. Une FAQ qui ne répond
 * jamais non n'est pas une FAQ, c'est un argumentaire : elle laisse le lecteur
 * découvrir les limites après s'être engagé, au moment où elles coûtent le plus
 * cher.
 *
 * ⚠️ `framer-motion` et le `"use client"` ont disparu : `<details>` fait la même
 * chose nativement, reste ouvrable sans JavaScript, et est correctement annoncé
 * par les lecteurs d'écran. Un accordéon ne justifie pas d'embarquer une
 * bibliothèque d'animation sur une page publique consultée en 3G.
 */
const QUESTIONS = [
  {
    q: "Faut-il paramétrer toute l'école avant de commencer ?",
    r: "Non. Vous indiquez le nom de votre école et les niveaux que vous enseignez, vous inscrivez un élève, et son certificat de scolarité est éditable dans la foulée. Les tarifs, les matières, les périodes et les coordonnées peuvent attendre le moment où vous en aurez besoin.",
  },
  {
    q: "EduCom fonctionne-t-il sur un téléphone ?",
    r: "Oui. Les écrans sont mesurés sur une largeur de 390 px — celle d'un téléphone courant — et non simplement « adaptés ». Il n'y a rien à installer : EduCom s'ouvre dans le navigateur.",
  },
  {
    q: "Les parents doivent-ils installer une application ?",
    r: "Non, et il n'existe aucune application EduCom à installer, ni pour les parents ni pour l'école. Le rôle « Parent » existe dans le produit et ne donne accès qu'aux documents et aux paiements de ses propres enfants.",
  },
  {
    q: "Peut-on suivre les paiements des familles ?",
    r: "Oui : grille tarifaire, factures, reçus, lettres de relance, dépenses et situation financière de l'établissement. En revanche EduCom n'encaisse pas — les paiements sont enregistrés une fois reçus, ils ne sont pas prélevés.",
  },
  {
    q: "Peut-on envoyer les documents aux parents par WhatsApp, SMS ou e-mail ?",
    r: "Pas encore. EduCom prépare le document et le message, mais aucun envoi automatique n'est effectué à ce jour : le produit ne dispose d'aucun service d'envoi opérationnel. Il ne vous annoncera jamais qu'un message est parti alors qu'il ne l'est pas.",
  },
  {
    q: "Peut-on importer nos élèves depuis un fichier Excel ?",
    r: "Pas encore. Les élèves s'inscrivent un par un. Si vous avez déjà plusieurs centaines d'élèves dans un classeur, dites-le-nous avant de commencer : c'est un chantier ouvert, et le nombre d'écoles concernées décidera de sa priorité.",
  },
  {
    q: "Que se passe-t-il au bout des 14 jours d'essai ?",
    r: "Rien d'automatique. EduCom n'a pas de paiement en ligne : aucune carte n'est enregistrée, rien ne peut être débité, et l'essai ne se transforme pas seul en abonnement. La suite se convient directement avec nous.",
  },
  {
    q: "Mes données sont-elles en sécurité ?",
    r: "Ce que nous pouvons affirmer, parce que c'est vérifié : chaque école est cloisonnée et aucune requête ne franchit cette frontière ; les pièces des élèves sont stockées dans un espace privé, sans adresse publique, accessibles par des liens qui expirent ; la connexion à la base de données est chiffrée ; et chaque consultation, export ou téléchargement est journalisé. Nous ne revendons aucune donnée. Les conditions d'utilisation et la politique de confidentialité sont en cours de rédaction pour le cadre sénégalais, et seront publiées avant toute mise en service auprès des familles.",
  },
];

export default function FAQSection() {
  return (
    <section className="border-t border-m-line bg-m-card">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-m-ink-faint">
              Questions fréquentes
            </p>
            <h2 className="mt-5 font-display text-[2rem] font-bold leading-[1.15] tracking-[-0.015em] text-m-ink">
              Ce qu&apos;EduCom fait, et ce qu&apos;il ne fait pas.
            </h2>
          </div>

          <div className="border-t border-m-line">
            {QUESTIONS.map((f) => (
              <details key={f.q} className="group border-b border-m-line">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-5 text-[16px] font-semibold text-m-ink marker:hidden [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <ChevronDown
                    aria-hidden="true"
                    className="mt-0.5 h-4 w-4 shrink-0 text-m-ink-faint transition-transform group-open:rotate-180"
                  />
                </summary>
                <p className="pb-6 pr-10 text-[15px] leading-[1.75] text-m-ink-soft">{f.r}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
