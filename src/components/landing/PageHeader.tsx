/**
 * En-tête des pages publiques secondaires — addendum PLG.
 *
 * ═══ CE QUI ÉTAIT EN PLACE ═══
 *
 * Les quatre pages (`/features`, `/solutions`, `/pricing`, `/how-it-works`)
 * répétaient chacune le même bloc copié-collé, avec le même défaut :
 *
 * ⚠️ un titre `text-4xl md:text-5xl font-extrabold` **centré**, dont le dernier
 *    mot était coloré en bleu — « pensées pour **l'excellence** », « adaptées à
 *    vos **défis** », « tarification **transparente** », « mise en place
 *    **ultra-rapide** ». Quatre superlatifs, aucune information : on peut lire
 *    les quatre titres sans apprendre ce que fait le produit.
 * ⚠️ un `pt-24` destiné à compenser une barre de navigation `fixed` — devenue
 *    `sticky`, elle réserve désormais sa place elle-même, et ce rembourrage ne
 *    produisait plus qu'un grand vide en haut de chaque page.
 *
 * Le bloc vit maintenant à un seul endroit, aligné à gauche comme le reste de
 * la composition, et les titres disent de quoi la page parle.
 */
export default function PageHeader({
  surtitre,
  titre,
  intro,
}: {
  surtitre: string;
  titre: string;
  intro: string;
}) {
  return (
    <section className="border-b border-m-line bg-m-paper">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="max-w-3xl">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-m-ink-faint">
            {surtitre}
          </p>
          <h1 className="mt-5 font-display text-[2.25rem] font-bold leading-[1.12] tracking-[-0.02em] text-m-ink sm:text-[2.75rem]">
            {titre}
          </h1>
          <p className="mt-6 text-[17px] leading-[1.7] text-m-ink-soft">{intro}</p>
        </div>
      </div>
    </section>
  );
}
