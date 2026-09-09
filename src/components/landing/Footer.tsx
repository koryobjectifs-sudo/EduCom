import Link from "next/link";

/**
 * Pied de page — chantier PLG, restylé par l'addendum.
 *
 * ⚠️ **DIX liens pointaient vers `#`** : Nouveautés, Centre d'aide, Blog, Guides
 * pratiques, API, À propos, Contact, Confidentialité, CGV… Un pied de page qui
 * ne mène nulle part est une promesse de contenu que personne ne tient : cliquer
 * et ne rien obtenir coûte plus de confiance que l'absence du lien.
 *
 * Ne restent que des destinations RÉELLES. Confidentialité et CGU reviendront
 * quand les textes existeront (`rappel.md` §41) — et la mention qui l'annonce
 * reste, parce qu'une école a le droit de savoir que ces textes manquent avant
 * de confier des données d'enfants.
 *
 * ⚠️ Le « E » dans un carré est remplacé par le logotype de marque,
 * qui existait depuis toujours dans `public/brand/`.
 *
 * ⚠️ Refonte du 4 septembre 2026 : même encre profonde que `FinalCTA` et
 * `SystemSection` — le pied de page ferme le même registre sombre plutôt que
 * d'introduire une quatrième nuance de noir.
 *
 * ⚠️ CORRECTION DU 5 SEPTEMBRE 2026 — découverte en auditant la marque à la
 * demande de Kory. **Les quinze SVG de `public/brand/` ne sont PAS le logo
 * officiel** : ce sont tous la même forme géométrique abstraite (un « E »
 * en crochets), un symbole placeholder différent du vrai blason (écu
 * marine/rouge, toque, livre ouvert) qui n'existe qu'en JPG,
 * `educom-logo-officiel.jpg`. Le logo réel n'a ni variante blanche ni
 * variante transparente : voir la plaque blanche posée autour de l'image
 * ci-dessous.
 *
 * ⚠️ CORRECTION DU 5 SEPTEMBRE 2026 (v5) — le paragraphe ci-dessus annonçait
 * le filigrane de fond (`educom-symbole-blanc.svg`) déjà retiré ; la sonde de
 * validation de la v5 a trouvé le `<img>` toujours présent dans le rendu
 * réel. Retiré pour de vrai cette fois, et vérifié par la même sonde.
 */
export default function Footer() {
  const annee = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden border-t border-white/5 bg-m-ink-deep text-white/70">
      <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            {/* ⚠️ `educom-logo-officiel.jpg` a un fond blanc gravé dans le
                fichier — aucune variante transparente fidèle n'existe dans
                `public/brand/` (voir l'en-tête plus bas : tous les SVG du
                dossier sont un symbole abstrait différent, jamais utilisable
                ici). Sur le marine profond du pied de page, le logo tel quel
                laisserait un rectangle blanc disgracieux. La plaque blanche
                est un choix de présentation autour du fichier, qui reste
                inchangé au pixel près. */}
            <Link href="/" aria-label="EduCom — accueil" className="inline-flex items-center rounded-[10px] bg-white p-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/educom-logo-officiel.jpg"
                alt="EduCom"
                width={156}
                height={28}
                className="h-7 w-auto"
              />
            </Link>
            <p className="mt-6 max-w-sm text-[15px] leading-[1.7] text-white/60">
              Les dossiers, les bulletins et les frais des écoles privées africaines, au même
              endroit.
            </p>
          </div>

          <div>
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-white">
              Produit
            </h2>
            {/* ⚠️ Chaque lien faisait 19 px de haut — la hauteur du texte. Un
                pied de page se manipule au pouce, en bas de l'écran, là où la
                main est la moins précise. Les entrées offrent maintenant 44 px. */}
            <ul className="mt-3 text-[15px]">
              <li><Link className="flex min-h-11 items-center transition-colors hover:text-white" href="/features">Fonctionnalités</Link></li>
              <li><Link className="flex min-h-11 items-center transition-colors hover:text-white" href="/solutions">Solutions</Link></li>
              <li><Link className="flex min-h-11 items-center transition-colors hover:text-white" href="/how-it-works">Déroulé</Link></li>
              <li><Link className="flex min-h-11 items-center transition-colors hover:text-white" href="/pricing">Tarifs</Link></li>
            </ul>
          </div>

          <div>
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-white">
              Commencer
            </h2>
            {/* ⚠️ Chaque lien faisait 19 px de haut — la hauteur du texte. Un
                pied de page se manipule au pouce, en bas de l'écran, là où la
                main est la moins précise. Les entrées offrent maintenant 44 px. */}
            <ul className="mt-3 text-[15px]">
              <li><Link className="flex min-h-11 items-center transition-colors hover:text-white" href="/register">Commencer gratuitement</Link></li>
              <li><Link className="flex min-h-11 items-center transition-colors hover:text-white" href="/login">Se connecter</Link></li>
            </ul>
          </div>

          <div>
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-white">
              Mentions
            </h2>
            <p className="mt-5 max-w-xs text-[14px] leading-[1.7] text-white/60">
              Les conditions d&apos;utilisation et la politique de confidentialité sont en
              cours de rédaction. Elles seront publiées ici avant toute mise en service
              auprès des familles.
            </p>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-white/10 pt-8 text-[13px] text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {annee} EduCom. Tous droits réservés.</p>
          <p>Conçu à Dakar, pour les écoles du Sénégal.</p>
        </div>
      </div>
    </footer>
  );
}
