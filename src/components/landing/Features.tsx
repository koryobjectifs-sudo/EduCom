"use client";

import { motion } from "framer-motion";
import { Users, FileSignature, GraduationCap, Wallet, FolderCheck, KeyRound } from "lucide-react";

/**
 * Le produit — chantier PLG, réécrit par l'addendum.
 *
 * ═══ CE QUI ÉTAIT AFFICHÉ, ET POURQUOI C'ÉTAIT INDÉFENDABLE ═══
 *
 * Six cartes, dont **trois fausses ou invérifiables** :
 *
 * ⚠️ « Suivi des présences » — aucune donnée de présence n'existe au schéma. Le
 *    lot 08 avait déjà dû retirer un `attendanceRate: 98` inventé du tableau de
 *    bord ; la page d'accueil continuait de vendre le module.
 * ⚠️ « Communication fluide — messagerie intégrée entre administration,
 *    enseignants, élèves et parents ». Le lot 17 a prouvé qu'**aucun canal ne
 *    peut émettre** : Twilio est en compte d'essai sans numéro, il n'existe
 *    aucun service d'e-mail (`rappel.md` §30 à §32). Promettre une messagerie
 *    vers les familles était la promesse la plus coûteuse de la page.
 * ⚠️ « Vos données sont cryptées, sauvegardées régulièrement et conformes aux
 *    normes RGPD ». Chiffrement au repos, sauvegardes et conformité sont
 *    **explicitement listés comme NON vérifiés** (`rappel.md` §42). Et le RGPD
 *    n'est pas le texte applicable au Sénégal : c'est la **Loi n°2008-12**
 *    (§41). Trois affirmations, trois problèmes distincts.
 *
 * ⚠️ S'y ajoutaient des pastilles pastel (`bg-blue-100`, `bg-amber-100`,
 * `bg-purple-100`…) hors de toute charte, et un `group-hover:scale-110
 * group-hover:-rotate-3` sur chaque icône.
 *
 * ═══ CE QUI LE REMPLACE ═══
 *
 * Six capacités **adossées à des écrans qui existent**, chacune vérifiable dans
 * `src/app/dashboard/`. Et surtout : un encart qui dit ce qu'EduCom **ne fait
 * pas encore**. C'est contre-intuitif sur une page de vente, et c'est le
 * meilleur outil de confiance dont dispose un produit jeune — la directrice qui
 * lit « pas d'encaissement en ligne » avant de s'inscrire ne se sentira pas
 * trompée le premier jour.
 */
const CAPACITES = [
  {
    icon: Users,
    titre: "Élèves et classes",
    detail:
      "Dossiers, inscriptions par année scolaire, répartition dans les classes et suivi individuel.",
  },
  {
    icon: FileSignature,
    titre: "Documents officiels",
    detail:
      "Certificats de scolarité, fiches de renseignements, emplois du temps — à l'en-tête de votre école, prêts à imprimer.",
  },
  {
    icon: GraduationCap,
    titre: "Notes et bulletins",
    detail:
      "Évaluations par matière et par période, moyennes calculées, bulletins édités et archivés.",
  },
  {
    icon: Wallet,
    titre: "Frais, factures et reçus",
    detail:
      "Grille tarifaire, factures, reçus, relances, dépenses et situation financière de l'établissement.",
  },
  {
    icon: FolderCheck,
    titre: "Dossier numérique de l'élève",
    detail:
      "Pièces obligatoires par cycle, pièces manquantes visibles d'un coup d'œil, dossier complet exportable.",
  },
  {
    icon: KeyRound,
    titre: "Équipe et permissions",
    detail:
      "Sept rôles — direction, secrétariat, enseignant, comptable, assistant, parent — chacun ne voyant que ce qui le concerne.",
  },
];

export default function Features() {
  return (
    <section id="produit" className="scroll-mt-20 border-t border-m-line bg-m-card">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="max-w-2xl">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-m-ink-faint">
            Le produit
          </p>
          <h2 className="mt-5 font-display text-[2rem] font-bold leading-[1.15] tracking-[-0.015em] text-m-ink sm:text-[2.5rem]">
            Six chantiers de l&apos;école, dans un seul espace.
          </h2>
          <p className="mt-6 text-[16px] leading-[1.7] text-m-ink-soft">
            Chacun est un écran que vous pouvez ouvrir dès la création de votre espace. Rien
            n&apos;est à installer, rien n&apos;est à paramétrer avant de commencer.
          </p>
        </div>

        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.1 }
            }
          }}
          className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {CAPACITES.map((c) => (
            <motion.div 
              key={c.titre}
              variants={{
                hidden: { opacity: 0, y: 30, scale: 0.95 },
                visible: { 
                  opacity: 1, 
                  y: 0, 
                  scale: 1,
                  transition: { type: "spring", stiffness: 100, damping: 15 }
                }
              }}
              whileHover={{ 
                y: -6, 
                transition: { type: "spring", stiffness: 400, damping: 25 }
              }}
              className="group relative flex flex-col rounded-[20px] bg-white p-7 border border-slate-200 shadow-sm transition-shadow hover:shadow-xl hover:border-primary/30"
            >
              <div className="mb-5 h-1.5 w-8 rounded-full bg-primary/80 transition-all duration-300 group-hover:w-12 group-hover:bg-primary" />
              <h3 className="text-[17px] font-semibold leading-snug text-slate-900 group-hover:text-primary transition-colors">
                {c.titre}
              </h3>
              <p className="mt-3 text-[14.5px] leading-[1.6] text-slate-600">{c.detail}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* ⚠️ L'encart le plus important de la page : ce que le produit ne fait
            pas. Il ne doit jamais être supprimé « parce que ça fait mauvais
            effet » — il doit être RÉDUIT à mesure que les manques sont comblés. */}
        <div className="mt-16 rounded-[14px] border border-m-line bg-m-paper p-7 sm:p-9">
          <h3 className="font-display text-[19px] font-bold text-m-ink">
            Ce qu&apos;EduCom ne fait pas encore
          </h3>
          <p className="mt-3 max-w-2xl text-[15px] leading-[1.7] text-m-ink-soft">
            Nous préférons que vous le sachiez avant de créer votre espace, plutôt que le
            premier jour d&apos;utilisation.
          </p>
          <ul className="mt-6 grid grid-cols-1 gap-x-10 gap-y-3.5 sm:grid-cols-2">
            {[
              "Pas de suivi des présences.",
              "Pas d'encaissement en ligne : les paiements sont enregistrés, pas prélevés.",
              "Pas d'envoi automatique aux familles par SMS, WhatsApp ou e-mail.",
              "Pas d'import de vos listes d'élèves depuis Excel.",
            ].map((l) => (
              <li key={l} className="flex gap-3 text-[15px] leading-[1.6] text-m-ink-soft">
                <span aria-hidden="true" className="mt-2.5 h-px w-3.5 shrink-0 bg-m-ink-faint" />
                {l}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
