import { Building2, ShieldCheck, Smartphone, Printer } from "lucide-react";

/**
 * Bandeau de preuves — chantier PLG, restylé par l'addendum.
 *
 * ═══ CE QUI ÉTAIT AFFICHÉ ═══
 *
 * ⚠️ Quatre pastilles **en anglais** sur une page entièrement française :
 * « Mobile-first », « Secure », « French & English », « Africa-ready ». La
 * troisième était fausse — l'interface n'existe qu'en français. Les trois
 * autres étaient des étiquettes sans contenu : « Secure » n'engage à rien.
 *
 * ═══ CE QUI LES REMPLACE ═══
 *
 * Quatre affirmations **vraies, vérifiées et vérifiables**, chacune avec sa
 * conséquence concrète. Elles portent sur ce que les lots 13 à 17 et le
 * durcissement RLS ont réellement établi (`rappel.md` §36, §42).
 *
 * ⚠️ Rien sur le chiffrement au repos, les sauvegardes ou la disponibilité :
 * ces trois points ne sont **pas vérifiés** (`rappel.md` §42) et n'ont donc rien
 * à faire sur une page publique. C'est la ligne que la section ne franchit pas.
 */
const PREUVES = [
  {
    icon: Building2,
    titre: "Chaque école est cloisonnée",
    detail: "Aucune requête ne franchit la frontière d'un établissement.",
  },
  {
    icon: ShieldCheck,
    titre: "Les pièces des élèves restent privées",
    detail: "Aucun document n'a d'adresse publique ; les liens expirent.",
  },
  {
    icon: Smartphone,
    titre: "Conçu pour un téléphone",
    detail: "Les écrans sont mesurés sur 390 px, pas seulement adaptés.",
  },
  {
    icon: Printer,
    titre: "Des documents à imprimer",
    detail: "Attestations et bulletins sortent à l'en-tête de votre école.",
  },
];

export default function TrustSection() {
  return (
    <section className="border-y border-m-line bg-m-paper-deep">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {PREUVES.map((p) => (
            <div key={p.titre} className="flex gap-3.5">
              <p.icon
                aria-hidden="true"
                className="mt-0.5 h-[18px] w-[18px] shrink-0 text-m-accent-deep"
              />
              <div className="min-w-0">
                <p className="text-[14px] font-semibold leading-snug text-m-ink">{p.titre}</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-m-ink-soft">{p.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
