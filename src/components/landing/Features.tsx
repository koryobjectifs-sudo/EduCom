"use client";

import { motion } from "framer-motion";
import {
  Users, FileSignature, GraduationCap, Wallet, FolderCheck, KeyRound, ClipboardCheck,
} from "lucide-react";

/**
 * Le produit — mis à jour le 4 septembre 2026, sur demande de Kory
 * (« actualiser tout ce qui est EduCom avec toutes les features qu'on a déjà
 * lancées »). Ce fichier avait le défaut inverse de celui que l'addendum PLG
 * avait corrigé le 27 août : il ne mentait plus, mais il **sous-vendait** —
 * trois choses qu'il présentait comme absentes existent maintenant, vérifiées
 * en navigateur réel dans cette même session (`context.md`, 3 septembre) :
 *
 * ⚠️ Les présences existent (`Attendance`, prise par classe, écran dédié) —
 *    l'ancien texte disait explicitement l'inverse.
 * ⚠️ L'import Excel/CSV des élèves existe (`students/import`, avec aperçu
 *    avant import) — l'ancien texte disait explicitement l'inverse.
 * ⚠️ Le dossier numérique a gagné un référentiel officiel sénégalais par
 *    cycle et un portail de conformité pour toute l'école — l'ancien texte ne
 *    décrivait que le dossier élève seul.
 *
 * ═══ CE QUI RESTE VRAI, ET NE CHANGE PAS ═══
 *
 * ⚠️ L'envoi WhatsApp reste **prudent**, volontairement. Le canal existe et a
 * été prouvé une fois en production avec de vraies API Meta (`context.md`,
 * lot Communication), mais la connexion en libre-service d'une nouvelle école
 * est aujourd'hui bloquée côté Meta (`rappel.md`, section WhatsApp/Meta) et
 * aucune école n'est connectée en base au moment d'écrire ceci. On ne
 * promet donc pas un canal universellement actif — seulement ce qui est vrai :
 * disponible pour les écoles pilotes, en cours de généralisation. À resserrer
 * dès que le blocage Meta est levé, pas avant.
 * ⚠️ L'encaissement en ligne n'existe toujours pas. L'encart « ce qu'EduCom ne
 * fait pas encore » reste — et reste le meilleur outil de confiance d'un
 * produit jeune.
 *
 * ⚠️ Refonte visuelle du 4 septembre 2026 : les cartes utilisaient `slate-*`
 * et `primary` (la couleur de tenant du PRODUIT, pas de la marque) au lieu des
 * tokens `m-*` du reste de la page — et l'icône de chaque capacité, importée
 * et présente dans `CAPACITES`, n'était jamais affichée. Corrigé : icône
 * visible dans une pastille marine, palette entièrement `m-*`.
 */
const CAPACITES = [
  {
    icon: Users,
    titre: "Élèves et classes",
    detail:
      "Dossiers, inscriptions par année scolaire, répartition dans les classes — un par un, ou en important votre liste depuis Excel ou CSV.",
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
    icon: ClipboardCheck,
    titre: "Présences",
    detail:
      "L'enseignant fait l'appel, classe par classe. Le secrétariat voit les absences du jour et peut notifier un parent en un clic.",
  },
  {
    icon: Wallet,
    titre: "Frais, factures et reçus",
    detail:
      "Grille tarifaire, factures, reçus, relances, dépenses et situation financière de l'établissement.",
  },
  {
    icon: FolderCheck,
    titre: "Dossier numérique et conformité",
    detail:
      "Référentiel officiel des pièces exigées par cycle au Sénégal, dossier organisé par rayon, et un taux de conformité pour toute l'école — pas seulement élève par élève.",
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
            Sept chantiers de l&apos;école, dans un seul espace.
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
              className="group relative flex flex-col rounded-[16px] border border-m-line bg-m-card p-7 shadow-sm transition-[border-color,box-shadow] duration-300 hover:border-m-gold/40 hover:shadow-m-lift"
            >
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-[12px] bg-m-ink text-m-gold-soft transition-colors duration-300 group-hover:bg-m-ink-deep">
                <c.icon aria-hidden="true" className="h-5 w-5" />
              </span>
              <h3 className="mt-5 text-[17px] font-semibold leading-snug text-m-ink">
                {c.titre}
              </h3>
              <p className="mt-3 text-[14.5px] leading-[1.6] text-m-ink-soft">{c.detail}</p>
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
              "Pas d'encaissement en ligne : les paiements sont enregistrés, pas prélevés.",
              "Pas d'envoi groupé par SMS ou e-mail.",
              "L'envoi WhatsApp aux familles est en cours de déploiement — disponible pour les écoles pilotes.",
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
