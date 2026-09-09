import Image from "next/image";

/**
 * « Montrer, pas décrire » — refonte visuelle du 5 septembre 2026 (v6).
 *
 * ═══ CE QUI CHANGE ═══
 *
 * - `fiche-eleve.png` (l'ancienne capture, élève « Pape Mbaye ») est
 *   remplacée par `fiche-aissatou.png` : même mécanique (vraie capture de
 *   `/dashboard/students/[id]`, aucune reconstitution), mais avec Aïssatou
 *   Ndiaye — la même élève que le hero et `SystemInAction` plus bas. La
 *   répétition du nom à travers la page est le dispositif de preuve : un seul
 *   dossier qui traverse tout le produit, jamais un nouveau personnage par
 *   section.
 * - La capture n'est plus posée dans une carte à coins arrondis avec ombre :
 *   elle occupe la pleine largeur du viewport (bord à bord), traitée comme
 *   une pièce éditoriale plutôt qu'un bloc parmi d'autres (direction F du
 *   plan validé).
 * - L'encart « ce qu'EduCom ne fait pas encore » reste inchangé.
 */
export default function ProductStory() {
  return (
    <section id="produit" className="scroll-mt-20 bg-m-paper">
      <div className="mx-auto max-w-6xl px-4 pt-14 sm:px-6 lg:px-8 lg:pt-20">
        <div className="max-w-2xl">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-m-ink-faint">
            Le produit
          </p>
          <h2 className="mt-4 font-display text-[1.625rem] font-semibold leading-[1.2] tracking-[-0.02em] text-m-ink sm:text-[2.125rem]">
            Le dossier qui naît de votre annuaire.
          </h2>
          <p className="mt-4 text-[15px] leading-[1.65] text-m-ink-soft">
            Identité, dossier, présences, notes, finance, famille — un seul onglet à la fois,
            jamais un système à part. Voici l&apos;écran réel, pas une maquette.
          </p>
        </div>
      </div>

      {/* Bord à bord — pas de carte, pas de conteneur centré. La preuve
          produit la plus importante de la page mérite plus qu'un bloc parmi
          d'autres. */}
      <div className="mt-8 w-full">
        <Image
          src="/marketing/fiche-aissatou.png"
          alt="Fiche d'Aïssatou Ndiaye dans EduCom : matricule, classe et statut générés automatiquement, six onglets pour un seul dossier"
          width={2277}
          height={521}
          className="h-auto w-full"
          sizes="100vw"
        />
      </div>
      <div className="mx-auto max-w-6xl px-4 pb-14 sm:px-6 lg:px-8 lg:pb-20">
        <p className="mt-3 text-[12px] leading-relaxed text-m-ink-faint">
          Capture de l&apos;écran réel. Matricule, classe et statut sont calculés par EduCom —
          rien n&apos;est ressaisi à la main. Élève et données d&apos;exemple.
        </p>

        {/* ⚠️ L'encart le plus important de la page : ce que le produit ne fait
            pas. À RÉDUIRE à mesure que les manques sont comblés, jamais à
            supprimer parce que ça fait mauvais effet. */}
        <div className="mt-8 rounded-[14px] border border-m-line bg-m-paper-deep p-6 sm:p-7">
          <h3 className="font-display text-[17px] font-semibold text-m-ink">
            Ce qu&apos;EduCom ne fait pas encore
          </h3>
          <p className="mt-2.5 max-w-2xl text-[14px] leading-[1.65] text-m-ink-soft">
            Nous préférons que vous le sachiez avant de créer votre espace, plutôt que le
            premier jour d&apos;utilisation.
          </p>
          <ul className="mt-5 grid grid-cols-1 gap-x-10 gap-y-3 sm:grid-cols-2">
            {[
              "Pas d'encaissement en ligne : les paiements sont enregistrés, pas prélevés.",
              "Pas d'envoi groupé par SMS ou e-mail.",
              "L'envoi WhatsApp direct depuis le dossier de l'élève est en cours de déploiement — disponible pour les écoles pilotes. EduCom ne remplace pas vos groupes WhatsApp : il y retrouve le bon contact.",
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
