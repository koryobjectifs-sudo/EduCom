import Image from "next/image";

/**
 * Chrome minimal pour toute capture produit de la landing — refonte v7
 * (6 septembre 2026). Étudié en réel sur slack.com (Playwright) : Slack ne
 * pose jamais ses captures dans une carte bordée avec légende dessous — un
 * minimum de contexte (pastilles de couleur, libellé) suffit à dire « ceci
 * est un logiciel », sans habiller la preuve d'un cadre qui l'éloigne du
 * reste de la page. Réutilisé par `HeroSection`, `ConnectedSystem` et
 * `ProductStory` pour que la page ait UN seul langage visuel de preuve
 * produit, pas trois traitements différents.
 */
type Props =
  | {
      label: string;
      className?: string;
      src: string;
      alt: string;
      width: number;
      height: number;
      sizes?: string;
      priority?: boolean;
      children?: never;
    }
  | {
      label: string;
      className?: string;
      /** Contenu réaliste mais construit (mockup) — jamais présenté comme un écran réel. */
      children: React.ReactNode;
      src?: never;
    };

export default function ScreenFrame(props: Props) {
  const { label, className = "" } = props;
  return (
    <div className={`overflow-hidden rounded-[14px] bg-m-card shadow-m-lift ring-1 ring-m-line ${className}`}>
      <div className="flex items-center gap-2 border-b border-m-line-soft bg-m-paper px-3.5 py-2.5">
        <span aria-hidden="true" className="h-2 w-2 rounded-full bg-m-line" />
        <span aria-hidden="true" className="h-2 w-2 rounded-full bg-m-line" />
        <span aria-hidden="true" className="h-2 w-2 rounded-full bg-m-line" />
        <span className="ml-1.5 truncate text-[11px] font-medium text-m-ink-faint">{label}</span>
      </div>
      {"src" in props && props.src ? (
        <Image
          src={props.src}
          alt={props.alt}
          width={props.width}
          height={props.height}
          priority={props.priority}
          sizes={props.sizes}
          className="h-auto w-full"
        />
      ) : (
        <div className="bg-m-card p-6">{"children" in props ? props.children : null}</div>
      )}
    </div>
  );
}
