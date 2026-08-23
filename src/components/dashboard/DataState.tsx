import Link from "next/link";
import {
  CircleDashed, Inbox, PowerOff, CheckCircle2, ArrowRight, type LucideIcon,
} from "lucide-react";

/**
 * Le vocabulaire d'états du tableau de bord — **quatre, et pas un de plus**.
 *
 * ═══ POURQUOI CE COMPOSANT EXISTE ═══
 *
 * Après la première passe, cinq cartes disaient « il n'y a rien » de cinq
 * façons différentes : « Aucune facture émise… », « Aucun trimestre n'est encore
 * déclaré… », « Aucun message envoyé », « Présences non suivies », « Tout est à
 * jour ». Toutes honnêtes, toutes dessinées différemment, et surtout **toutes
 * lues comme un manque** — y compris celle qui annonçait une bonne nouvelle.
 *
 * Les quatre états ci-dessous ne sont pas des nuances de style : ils appellent
 * quatre réactions différentes de la directrice.
 *
 *   · `unavailable` — la donnée existe en principe mais rien ne l'alimente
 *     encore. Elle ne peut rien y faire aujourd'hui. Ton neutre, très discret.
 *   · `empty` — la table est vide parce que l'activité n'a pas commencé.
 *     Souvent accompagné d'une action : c'est à elle de la démarrer.
 *   · `inactive` — la fonctionnalité n'est pas activée dans EduCom. Ce n'est ni
 *     un manque de données ni une erreur ; c'est une capacité absente.
 *   · `allClear` — tout est à jour. **Seul état à porter une couleur**, parce
 *     que c'est le seul qui soit une bonne nouvelle.
 *
 * ⚠️ **Un état non mesuré n'est jamais peint comme un mauvais résultat.** Pas de
 * rouge, pas de zéro, pas de barre vide qui suggère l'échec. C'est la règle qui
 * gouverne ce fichier — une école qui vient d'ouvrir n'est pas une école en
 * difficulté.
 *
 * ⚠️ **Compact par défaut.** Les états vides occupaient de grands pavés
 * verticaux sur un écran dont la valeur est la densité.
 */

export type StateKind = "unavailable" | "empty" | "inactive" | "allClear";

const PRESET: Record<StateKind, { icon: LucideIcon; ring: string; tint: string }> = {
  unavailable: { icon: CircleDashed, ring: "border-rule", tint: "bg-sunk text-text-faint" },
  empty: { icon: Inbox, ring: "border-rule", tint: "bg-sunk text-text-soft" },
  inactive: { icon: PowerOff, ring: "border-rule", tint: "bg-sunk text-text-soft" },
  allClear: { icon: CheckCircle2, ring: "border-success/20", tint: "bg-success/10 text-success" },
};

export function DataState({
  kind,
  title,
  description,
  action,
  icon,
  className = "",
}: {
  kind: StateKind;
  title: string;
  description?: string;
  action?: { label: string; href: string };
  /** Icône contextuelle, quand elle parle mieux que celle de l'état. */
  icon?: LucideIcon;
  className?: string;
}) {
  const preset = PRESET[kind];
  const Icon = icon ?? preset.icon;

  return (
    /**
     * ⚠️ `flex-wrap` + une largeur minimale sur le texte : dans une colonne du
     * niveau 5 (~300 px à 1440), une rangée rigide écrasait la description sur
     * quatre mots de large et collait le bouton contre elle. Ici l'action se
     * replie d'elle-même sous le texte dès que la place manque — sans requête de
     * conteneur, donc sans dépendre du support du navigateur.
     */
    <div
      className={`flex flex-wrap items-start gap-x-3.5 gap-y-3 rounded-surface border border-dashed ${preset.ring} bg-ground/70 px-4 py-3.5 ${className}`}
    >
      <span
        aria-hidden="true"
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-control ${preset.tint}`}
      >
        <Icon className="h-4 w-4" />
      </span>

      <div className="min-w-[11rem] flex-1">
        <p className={`text-role-body font-semibold ${kind === "allClear" ? "text-success" : "text-text"}`}>
          {title}
        </p>
        {description && (
          <p className="mt-0.5 text-role-meta leading-relaxed text-text-soft">{description}</p>
        )}
      </div>

      {action && (
        <Link
          href={action.href}
          className="group ml-auto inline-flex shrink-0 items-center gap-1 rounded-control border border-rule bg-surface px-3 py-1.5 text-role-meta font-medium text-text-soft transition-all duration-200 hover:border-primary/30 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          {action.label}
          <ArrowRight aria-hidden="true" className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
