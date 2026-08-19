import Image from "next/image";
import { ArrowRight } from "lucide-react";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * HERO PROTOTYPE — DIRECTION PHOTOGRAPHIQUE
 * ───────────────────────────────────────────────────────────────────────────
 *
 * ═══ CE QUI CHANGE PAR RAPPORT AU HERO ACTUEL ═══
 *
 * Le hero en production montre le LIVRABLE (un certificat de scolarité). Ce
 * prototype montre les GENS qui le produisent. Ce n'est pas un habillage : les
 * deux répondent à des questions différentes — « qu'est-ce que ça me donne ? »
 * contre « à quoi ressemble une école qui tourne bien ? ». C'est précisément
 * l'arbitrage à trancher en regardant les deux côte à côte.
 *
 * ⚠️ LE TEXTE EST REPRIS MOT POUR MOT du hero actuel. Aucune nouvelle
 * proposition de valeur n'a été inventée : si la comparaison portait aussi sur
 * le message, on ne saurait plus ce qu'on juge.
 *
 * ═══ POURQUOI CETTE COMPOSITION, ET PAS UNE PHOTO DANS UN CADRE ═══
 *
 * Une photographie posée dans un rectangle arrondi à côté du texte est la
 * signature du gabarit SaaS. Ici le panneau photo **sort du cadre** : il touche
 * le bord droit, le haut et le bas de la section, et n'est arrondi que du côté
 * du texte. On ne voit plus une image dans une page, on voit une page ouverte
 * sur une scène.
 *
 * ⚠️ DEUX PHOTOS, PAS TROIS. La seconde (le couloir) chevauche la couture entre
 * le texte et le panneau : c'est ce chevauchement qui fait la composition. Une
 * troisième aurait produit une galerie — exactement ce que le brief écarte.
 *
 * ═══ CE QUI RELIE LA PHOTO AU PRODUIT ═══
 *
 * Rien, sur la photo — et c'est une décision, pas un oubli. Voir
 * `AFFICHER_LE_FEUILLET` plus bas : la variante avec un feuillet « Certificat
 * de scolarité » posé sur la scène a été essayée puis écartée. Le produit est
 * nommé par le texte, la photographie ne porte que la sensation.
 *
 * ⚠️ AUCUNE STATISTIQUE nulle part. Pas de « 94 % », pas de « 500 écoles », pas
 * de logo d'école, pas de témoignage. La ligne de réassurance ne contient que
 * des faits vérifiables, et c'est la même que sur la page en production.
 *
 * ═══ POURQUOI LA BASCULE DEUX COLONNES SE FAIT À `xl` (1280 px) ═══
 *
 * ⚠️ Elle était à `lg` (1024 px) et c'était trop tôt. À 1024, chaque colonne
 * tombe sous 500 px : le titre passait à cinq lignes, les DEUX boutons se
 * cassaient en deux lignes chacun (« Créer l'espace de mon / école ») et la
 * ligne de réassurance sortait de la section. Une composition côte à côte a
 * besoin d'une largeur minimale pour exister — en dessous, l'empilement
 * mobile est simplement meilleur, il n'est pas un pis-aller.
 *
 * ═══ LA HIÉRARCHIE MOBILE EST DISTINCTE, PAS RÉDUITE ═══
 *
 * Sur mobile, la scène passe APRÈS les boutons. L'ordre du brief est
 * proposition de valeur → action → scène : sur 390 px de large, mettre la photo
 * en premier repousserait le bouton sous la ligne de flottaison. La photo n'est
 * pas la même non plus — `object-position` la recadre sur les deux personnes
 * assises, parce que le cadrage large du bureau devient illisible en bande.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/** Ébauches base64 de 20 px : la photo s'installe en flou plutôt qu'en trou
 *  blanc. Sur une connexion mobile à Dakar, c'est la différence entre une page
 *  qui paraît vivante et une page qui paraît cassée. */
const EBAUCHE_REUNION =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQABLAEsAAD/2wBDAAkJCQkJCRAJCRAWEBAQFh4WFhYWHiYeHh4eHiYuJiYmJiYmLi4uLi4uLi43Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3/9sAQwELDAwSERIfEREfSzMqM0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS//dAAQAAf/aAAwDAQACEQMRAD8A728hjfUZQw6REjHHORVDxLqH9jxRusohjK8nGec4HY15kPFF7qetvdcy/I0caxgggHudorauZJl0IaZcWUhkjjO12xgZOVPBPJJAwazas9S1qtD/0OxmtraxdY7KJIFKhiIwBnnFVYYIrwhLgbtjFlOSOQeOh5rRv/8AXJ/1zH86p2H3z9W/nSfxF9D/2Q==";
const EBAUCHE_COULOIR =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAYABgAAD/2wBDAAkJCQkJCRAJCRAWEBAQFh4WFhYWHiYeHh4eHiYuJiYmJiYmLi4uLi4uLi43Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3/9sAQwELDAwSERIfEREfSzMqM0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS//dAAQAAv/aAAwDAQACEQMRAD8A39W1/Sbi1kktCJ5iSyOmcLtAUksOwyDjvXEy67eWssT3g3gglo0JAZSPlOeo5rtrvS7a0sJDbqqHzmkPvuYkA8e9eXeI71Y3hhkRTIEBMgzkgE4XHTA/OkknLUG2kejR67MYUOnWDSwlQQyZI/HHf1p/9uan/wBAyT8mrJnt9ft2X+xrjyIHG8RjGFLEk9fz9ulQf8Vp/wA/h/JP8KrTuFj/2Q==";

/**
 * ═══ LE SEUL RÉGLAGE DU PROTOTYPE ═══
 *
 * Faut-il poser un feuillet « Certificat de scolarité » sur la photo ?
 *
 * ⚠️ **Réglé sur `false` après comparaison des deux rendus.** Posé sur la
 * scène, ce feuillet se lit comme une infobulle d'interface flottant au-dessus
 * d'une photographie — c'est-à-dire précisément la signature « startup IA » que
 * le brief demande d'éviter. Sans lui, la photographie respire et la page passe
 * de « gabarit SaaS » à « campagne éditoriale ».
 *
 * Ce que son retrait coûte : le visuel ne dit plus EduCom, il dit « une école
 * qui tourne ». C'est assumé — le brief tranche lui-même ce partage des rôles
 * (« la photographie doit faire ressentir la valeur, le texte doit
 * l'expliquer »), et le texte, lui, nomme bien le certificat.
 *
 * Basculer à `true` pour revoir l'autre option sans rien réécrire.
 */
const AFFICHER_LE_FEUILLET = false;

export default function HeroPhoto() {
  return (
    <section className="relative overflow-hidden bg-m-paper xl:min-h-[calc(100svh-4rem)]">
      {/* ── COLONNE TEXTE ─────────────────────────────────────────────────── */}
      {/* ⚠️ Le conteneur porte lui-même la hauteur de la section et centre son
          contenu : sans cela le bloc de texte restait collé en haut et laissait
          200 px de papier mort sous la ligne de réassurance, alors que la photo,
          elle, descendait jusqu'en bas. Le hero paraissait déséquilibré à
          droite. */}
      <div className="mx-auto flex max-w-[1180px] flex-col justify-center px-5 sm:px-8 xl:min-h-[calc(100svh-4rem)]">
        {/* ⚠️ `xl:w-[50%]` n'est pas un chiffre au hasard : le conteneur est
            centré, donc ses 50 % tombent exactement sur le milieu du viewport,
            là où commence le panneau photo. Le `pr-20` est la marge de sûreté
            entre la fin du texte et la couture — sans lui, la carte « couloir »
            qui déborde vers la gauche viendrait mordre les boutons. */}
        <div className="relative z-20 pt-9 sm:pt-14 xl:w-[50%] xl:py-20 xl:pr-20">
          <p className="inline-flex items-center rounded-pill bg-m-accent-wash px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.13em] text-m-accent-deep sm:text-[12px]">
            Écoles privées du Sénégal
          </p>

          {/* ⚠️ `text-balance` répartit les lignes au lieu de les remplir. Sans
              lui, le titre finissait en cinq lignes dont une orpheline
              (« école, » seule) : le membre de phrase surligné est en
              `whitespace-nowrap` et poussait tout le reste. */}
          <h1 className="mt-5 max-w-[620px] text-balance font-display text-[2.15rem] font-bold leading-[1.09] tracking-[-0.02em] text-m-ink sm:mt-6 sm:text-[2.7rem] xl:max-w-none xl:text-[2.85rem] 2xl:text-[3rem]">
            Les dossiers, les bulletins et les frais de votre école,{" "}
            <span className="relative whitespace-nowrap">
              <span className="relative z-10">au même endroit</span>
              {/* Le seul trait de couleur du hero — en `em`, donc solidaire du
                  corps du texte à toutes les tailles. */}
              <span
                aria-hidden="true"
                className="absolute inset-x-0 bottom-[0.13em] z-0 h-[0.26em] rounded-[2px] bg-m-accent/30"
              />
            </span>
            .
          </h1>

          <p className="mt-5 max-w-xl text-[15.5px] leading-[1.68] text-m-ink-soft sm:mt-7 sm:text-[17px] sm:leading-[1.7]">
            Inscrivez un élève, et EduCom édite son certificat de scolarité à
            l&apos;en-tête de votre établissement. Puis ses bulletins, ses factures, et le
            dossier complet à présenter à l&apos;inspection.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:mt-9 sm:flex-row sm:items-center">
            <span className="inline-flex h-12 items-center justify-center gap-2 rounded-control bg-m-ink px-6 text-[15px] font-semibold text-white">
              Créer l&apos;espace de mon école
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </span>
            <span className="inline-flex h-12 items-center justify-center rounded-control border border-m-line bg-m-card px-6 text-[15px] font-semibold text-m-ink">
              Voir le déroulé
            </span>
          </div>

          {/* ⚠️ Uniquement des faits vérifiables — identique à la production. */}
          <p className="mt-6 max-w-lg text-[12.5px] leading-relaxed text-m-ink-faint sm:mt-7 sm:text-[13px]">
            Installation en trois minutes · Aucune carte bancaire demandée · Vos données
            restent celles de votre établissement
          </p>
        </div>
      </div>

      {/* ── COMPOSITION PHOTOGRAPHIQUE ────────────────────────────────────────
          Statique et pleine largeur sous `xl` ; panneau à fond perdu au-delà.
          Le `pb` mobile réserve la place au débord de la carte « couloir ». */}
      <div className="relative mt-9 pb-16 sm:mt-12 sm:pb-20 xl:absolute xl:inset-y-0 xl:right-0 xl:mt-0 xl:w-[50%] xl:pb-0">
        {/* Photo d'ancrage — elle touche trois bords de la section. */}
        <div className="relative h-[290px] overflow-hidden rounded-r-[26px] sm:h-[420px] xl:h-full xl:rounded-l-[32px] xl:rounded-r-none">
          <Image
            src="/prototype/hero/equipe-direction.jpg"
            alt="Trois membres de l'équipe d'une école privée de Dakar travaillent ensemble autour d'une table couverte de dossiers, l'un d'eux explique un point pendant qu'une collègue saisit sur un ordinateur portable."
            fill
            // Le recadrage n'est pas le même selon la largeur.
            // ⚠️ En bande mobile, le cadrage était à `28 %` : la tranche visible
            // au-dessus de la ligne de flottaison ne montrait que des fenêtres et
            // un plafond. On descend à `62 %` pour que ce soient les VISAGES qui
            // apparaissent en premier — sur 390 px, la scène n'a qu'une seule
            // occasion de produire son effet. En panneau vertical, on garde la
            // table et les dossiers, qui portent l'autre moitié du récit.
            className="object-cover object-[50%_62%] xl:object-[46%_50%]"
            sizes="(min-width: 1280px) 50vw, 100vw"
            placeholder="blur"
            blurDataURL={EBAUCHE_REUNION}
            // Next 16 : `priority` est déprécié au profit de `preload`.
            preload
            quality={82}
          />
          {/* Voile marine très bas, seulement dans l'angle inférieur gauche :
              il assied la photo sur le papier et évite que le blanc du couloir
              vienne concurrencer le titre. Ce n'est pas un dégradé décoratif. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-tr from-m-ink/22 via-transparent to-transparent"
          />
        </div>

        {/* Seconde scène — elle chevauche la couture. C'est ce débord qui fait
            la composition : sans lui, on a deux rectangles côte à côte.
            ⚠️ Le décalage était en `-bottom-4`, calculé depuis la boîte extérieure
            qui porte déjà `pb-16` : la carte se retrouvait 68 px SOUS la bande,
            posée sur le papier, sans plus rien chevaucher du tout. `bottom-6` la
            fait mordre le bas de la photo et dépasser d'une trentaine de pixels,
            ce qui était l'intention. */}
        <figure className="absolute bottom-6 left-5 w-[45%] max-w-[280px] sm:left-8 xl:-left-8 xl:bottom-10 xl:w-[54%] xl:max-w-[340px]">
          <div className="overflow-hidden rounded-[16px] bg-m-paper p-1.5 shadow-m-lift sm:p-2">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[11px]">
              <Image
                src="/prototype/hero/couloir-enseignants.jpg"
                alt="Deux enseignants s'arrêtent dans le couloir d'une école pour relire ensemble une liasse de copies, des élèves en uniforme passent derrière eux."
                fill
                className="object-cover object-[45%_42%]"
                sizes="(min-width: 1280px) 20vw, 45vw"
                placeholder="blur"
                blurDataURL={EBAUCHE_COULOIR}
                quality={82}
              />
            </div>
          </div>
        </figure>

        {/* Le feuillet « produit » — voir `AFFICHER_LE_FEUILLET` plus haut.
            ⚠️ Masqué sous `xl` de toute façon : en bande horizontale, il
            viendrait recouvrir un visage. */}
        {AFFICHER_LE_FEUILLET && (
          <div
            aria-hidden="true"
            className="absolute right-8 top-12 hidden w-[240px] -rotate-[1.5deg] rounded-[10px] border border-m-line bg-m-card px-4 py-3 shadow-m-lift xl:block"
          >
            <span className="block h-[3px] w-8 rounded-full bg-m-accent" />
            <span className="mt-2.5 block font-display text-[12px] font-bold uppercase tracking-[0.06em] text-m-ink">
              Certificat de scolarité
            </span>
            <span className="mt-1 block text-[11px] leading-snug text-m-ink-faint">
              à l&apos;en-tête de votre établissement
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
