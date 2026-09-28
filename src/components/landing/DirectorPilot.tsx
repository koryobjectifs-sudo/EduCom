import {
  AppleUsersIcon,
  AppleCalendarCheckIcon,
  AppleGraduationCapIcon,
  AppleFolderCheckIcon,
  AppleWalletIcon,
  ApplePhoneIcon,
  AppleAlertTriangleIcon,
} from "@/components/ui/apple-icons";
import EduComWordmark from "@/components/brand/EduComWordmark";

/**
 * « Le pilotage » — refonte visuelle du 5 septembre 2026 (v6).
 *
 * ⚠️ Contenu inchangé depuis sa création (chaque tuile correspond à un calcul
 * réel du produit — vérifié dans `dashboard.ts`, `reports.ts`,
 * `documentCompliance.ts` avant d'écrire cette section, voir l'historique
 * git).
 */
const TETE = [
  { icon: AppleUsersIcon, valeur: "247", detail: "élèves inscrits" },
  { icon: AppleCalendarCheckIcon, valeur: "94 %", detail: "de présence aujourd'hui" },
] as const;

const SECONDAIRES = [
  { icon: AppleGraduationCapIcon, valeur: "12,8/20", complement: "+0,3 pt", detail: "moyenne générale" },
  { icon: AppleFolderCheckIcon, valeur: "87 %", detail: "des dossiers complets" },
  { icon: AppleWalletIcon, valeur: "78 %", detail: "des frais du trimestre encaissés" },
  { icon: ApplePhoneIcon, valeur: "96 %", detail: "des familles joignables" },
] as const;

const ATTENTION = [
  "12 factures en retard de paiement",
  "4 admissions en attente de validation",
  "9 bulletins générés, pas encore lus par les familles",
  "1 classe sans enseignant titulaire",
];

export default function DirectorPilot() {
  return (
    <section id="pilotage" className="scroll-mt-16 bg-m-card">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="max-w-2xl">
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-m-blue">
            Pour la direction
          </p>
          <h2 className="mt-2.5 font-display text-[1.45rem] font-bold leading-[1.15] text-m-navy sm:text-[1.85rem]">
            Votre école, en un coup d&apos;œil.
          </h2>
          <p className="mt-2 text-[13.5px] leading-relaxed text-m-ink-soft">
            Effectifs, présences, encaissements, dossiers incomplets&nbsp;: ce que vous deviez
            demander à trois personnes s&apos;affiche dès l&apos;ouverture d&apos;<EduComWordmark />.
          </p>
        </div>

        <div className="mt-6 rounded-2xl bg-m-navy p-5 sm:p-6 lg:p-7">
          <div className="grid grid-cols-2 gap-4 border-b border-white/10 pb-4">
            {TETE.map((t) => (
              <div key={t.detail}>
                <t.icon aria-hidden="true" className="h-4.5 w-4.5 text-m-accent-bright" />
                <p className="mt-2 font-display text-[1.85rem] font-semibold leading-none tabular-nums text-white sm:text-[2.25rem]">
                  {t.valeur}
                </p>
                <p className="mt-1.5 text-[12.5px] text-white/55">{t.detail}</p>
              </div>
            ))}
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-b border-white/10 pb-4 sm:grid-cols-4">
            {SECONDAIRES.map((s) => (
              <div key={s.detail}>
                <dt className="flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-[0.06em] text-white/45">
                  <s.icon aria-hidden="true" className="h-3.5 w-3.5" />
                  {s.detail}
                </dt>
                <dd className="mt-1 text-[17px] font-semibold tabular-nums text-white">
                  {s.valeur}
                  {"complement" in s && (
                    <span className="ml-1 text-[11px] font-medium text-m-accent-bright">{s.complement}</span>
                  )}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-4">
            <h3 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-m-alert-bright">
              <AppleAlertTriangleIcon aria-hidden="true" className="h-3.5 w-3.5" />
              Centre d&apos;attention — aujourd&apos;hui
            </h3>
            <ul className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
              {ATTENTION.map((a) => (
                <li key={a} className="flex gap-2.5 text-[12.5px] leading-relaxed text-white/70">
                  <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-m-alert-bright" />
                  {a}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="mt-4 text-[12px] leading-relaxed text-m-ink-faint">
          Chiffres d&apos;exemple, pour une école illustrative. Chaque tuile correspond à un
          calcul réel du produit — aucun n&apos;est un plan futur.
        </p>
      </div>
    </section>
  );
}
