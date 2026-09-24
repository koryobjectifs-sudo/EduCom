import { School, BookOpen, GraduationCap, Building2, CheckCircle2 } from "lucide-react";

const CYCLES = [
  {
    nom: "Écoles Élémentaires / Primaires",
    description: "Du CI au CM2. Saisie simplifiée des sous-disciplines et bulletins conformes à l'éducation nationale sénégalaise.",
    icon: School,
    badge: "CI à CM2",
  },
  {
    nom: "Collèges & Cycle Moyen",
    description: "De la 6ème à la 3ème. Gestion rigoureuse des coefficients, des matières et préparation sereine du BFEM.",
    icon: BookOpen,
    badge: "6e à 3e",
  },
  {
    nom: "Lycées & Secondaire",
    description: "De la Seconde à la Terminale (L & S). Relevés de notes trimestriels, calculs de séries et préparation au Baccalauréat.",
    icon: GraduationCap,
    badge: "2nde à Tle",
  },
  {
    nom: "Groupes Scolaires Multi-cycles",
    description: "Établissements combinant primaire, collège et lycée. Une seule interface pour piloter l'ensemble de vos cycles.",
    icon: Building2,
    badge: "Multi-cycles",
  },
] as const;

export default function TargetAudience() {
  return (
    <section id="public" className="scroll-mt-20 bg-m-warm py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-m-ink-faint">
            Établissements ciblés
          </p>
          <h2 className="mt-4 font-display text-[2rem] font-semibold leading-[1.1] tracking-[-0.03em] text-m-ink sm:text-[2.75rem]">
            Conçu spécifiquement pour les écoles privées du Sénégal.
          </h2>
          <p className="mt-4 text-[15px] leading-[1.65] text-m-ink-soft">
            EduCom intègre dès le premier jour les spécificités du système scolaire sénégalais,
            ses cycles officiels, ses barèmes et ses documents réglementaires.
          </p>
        </div>

        {/* 4 Cartes de Cycles */}
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {CYCLES.map((c) => (
            <div
              key={c.nom}
              className="flex flex-col justify-between rounded-[16px] border border-m-line bg-m-card p-6 shadow-xs"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-m-paper border border-m-line text-m-ink">
                    <c.icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <span className="text-[11px] font-bold text-m-accent-deep uppercase tracking-wider bg-m-accent-wash px-2 py-0.5 rounded">
                    {c.badge}
                  </span>
                </div>
                <h3 className="mt-4 text-[15px] font-semibold text-m-ink leading-snug">
                  {c.nom}
                </h3>
                <p className="mt-2 text-[13px] leading-[1.6] text-m-ink-soft">
                  {c.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Bénéfice partagé : Direction vs Équipe administrative */}
        <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-[18px] border border-m-line bg-m-card p-7 sm:p-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[12px] font-semibold text-emerald-800 border border-emerald-200">
              Pour la Direction & les Fondateurs
            </div>
            <h3 className="mt-4 font-display text-[1.25rem] font-semibold text-m-ink">
              Visibilité totale, sérénité et contrôle.
            </h3>
            <ul className="mt-5 space-y-3">
              {[
                "Suivi des encaissements et réduction active des impayés.",
                "Bulletins et documents académiques conformes aux normes sénégalaises.",
                "Vision en temps réel des effectifs, présences et dossiers sans appeler le secrétariat.",
                "Tranquillité d'esprit : vos données scolaires restent sécurisées et sous votre contrôle.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[14px] text-m-ink-soft leading-relaxed">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[18px] border border-m-line bg-m-card p-7 sm:p-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[12px] font-semibold text-blue-800 border border-blue-200">
              Pour le Secrétariat, la Comptabilité & les Enseignants
            </div>
            <h3 className="mt-4 font-display text-[1.25rem] font-semibold text-m-ink">
              Moins de calculs manuels, des journées allégées.
            </h3>
            <ul className="mt-5 space-y-3">
              {[
                "Fin des calculs manuels de moyennes et des longues soirées de recomptage.",
                "Fini les attestations et certificats retapés à zéro sous Word : tout s'édite en 1 clic.",
                "Dossiers élèves et contacts parents immédiatement sous la main sans chercher dans des classeurs.",
                "Reçus et factures émis en quelques secondes sans risque d'erreur de numérotation.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[14px] text-m-ink-soft leading-relaxed">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-blue-600" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
