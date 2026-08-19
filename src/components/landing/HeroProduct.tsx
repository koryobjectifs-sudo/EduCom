/**
 * L'objet du hero — addendum PLG.
 *
 * ═══ POURQUOI UN DOCUMENT, ET PAS UNE CAPTURE D'ÉCRAN ═══
 *
 * L'usage veut qu'on montre l'interface. Mais une directrice ne veut pas d'une
 * interface : elle veut le papier qu'elle doit remettre au parent qui attend
 * dans le couloir. Montrer le **livrable** répond à « qu'est-ce que ça me
 * donne ? » avant même que la phrase soit lue.
 *
 * ⚠️ Une version antérieure dessinait une maquette du tableau de bord avec un
 * module « Présences » et une carte « 94 % de présence » : aucune donnée de
 * présence n'existe au schéma. Le hero vendait une fonctionnalité absente.
 *
 * ═══ CE QUE L'ADDENDUM CHANGE ═══
 *
 * La feuille unique devient une **pile légèrement décalée**. Ce n'est pas de la
 * décoration : c'est ce qu'on a réellement sur un bureau de direction en début
 * d'année, et cela dit sans une phrase que le certificat n'est pas un cas
 * isolé — il y en a autant qu'il y a d'élèves.
 *
 * ⚠️ Deux feuilles, pas cinq, et une inclinaison de 2°. Trois cartes flottantes
 * en cascade sont la signature exacte d'une maquette générée ; l'inclinaison est
 * annulée sous `sm` où elle ne produirait que du désordre.
 *
 * ⚠️ **Marqué EXEMPLE, lisiblement.** Le contenu est générique et ne se fait
 * jamais passer pour les données d'une école réelle.
 */
export default function HeroProduct() {
  return (
    <figure className="relative mx-auto w-full max-w-md lg:max-w-lg">
      {/* Feuille du dessous — présente uniquement pour donner l'épaisseur. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-6 bottom-5 top-9 hidden rounded-[14px] border border-m-line bg-m-card/70 sm:block sm:rotate-[2.2deg]"
      />

      <div className="relative overflow-hidden rounded-[14px] border border-m-line bg-m-card shadow-m-lift sm:-rotate-[0.9deg]">
        <div className="flex items-center justify-between gap-3 border-b border-m-line-soft bg-m-paper px-4 py-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-m-ink-faint">
            Certificat de scolarité
          </span>
          <span className="rounded-pill bg-m-ink px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
            Exemple
          </span>
        </div>

        <div className="px-6 py-8 sm:px-9 sm:py-10">
          {/* En-tête : c'est le nom de SON école qui s'imprimera ici. */}
          <div className="border-b-2 border-m-ink pb-4 text-center">
            <p className="font-display text-[17px] font-bold uppercase tracking-[0.08em] text-m-ink">
              Votre établissement
            </p>
            <p className="mt-1 text-[11px] tracking-wide text-m-ink-faint">Dakar · Sénégal</p>
          </div>

          <p className="mt-8 text-center font-display text-lg font-bold uppercase tracking-[0.1em] text-m-ink">
            Certificat de scolarité
          </p>

          <p className="mt-6 text-[13px] leading-[1.85] text-m-ink-soft">
            Je soussigné(e), Directeur de l&apos;établissement, certifie que
            l&apos;élève <span className="font-semibold text-m-ink">Prénom Nom</span>, né(e)
            le <span className="font-semibold text-m-ink">12 mars 2014</span>, est
            régulièrement inscrit(e) en <span className="font-semibold text-m-ink">CM2</span>{" "}
            pour l&apos;année scolaire{" "}
            <span className="font-semibold text-m-ink">2026-2027</span>.
          </p>

          <p className="mt-4 text-[13px] leading-[1.85] text-m-ink-soft">
            En foi de quoi la présente attestation lui est délivrée pour servir et valoir ce
            que de droit.
          </p>

          <div className="mt-10 flex items-end justify-between gap-6">
            <span className="text-[11px] text-m-ink-faint">Fait à Dakar</span>
            <span className="text-right">
              <span className="block text-[11px] text-m-ink-faint">Le Directeur</span>
              <span className="mt-8 block w-32 border-t border-m-line pt-1.5 text-[11px] text-m-ink-faint">
                Signature et cachet
              </span>
            </span>
          </div>
        </div>
      </div>

      <figcaption className="relative mt-6 text-center text-[13px] leading-relaxed text-m-ink-faint sm:mt-12">
        Édité en un clic depuis le dossier de l&apos;élève, à l&apos;en-tête de votre école.
      </figcaption>
    </figure>
  );
}
