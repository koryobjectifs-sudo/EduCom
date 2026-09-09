import { Users, CalendarCheck, GraduationCap, FolderCheck, Wallet, Phone, AlertTriangle } from "lucide-react";

/**
 * « Le pilotage » — refonte visuelle du 5 septembre 2026 (v6).
 *
 * ⚠️ Contenu inchangé depuis sa création (chaque tuile correspond à un calcul
 * réel du produit — vérifié dans `dashboard.ts`, `reports.ts`,
 * `documentCompliance.ts` avant d'écrire cette section, voir l'historique
 * git). Ce qui change : la composition. Six tuiles identiques + une carte de
 * liste (jugées « indiscernables d'un dashboard marketing générique », plan
 * validé étape 1) deviennent un seul panneau « control center » — deux
 * chiffres en tête à grande échelle, les autres en liste compacte, et un
 * nouvel accent chaud (`--m-alert-bright`, `globals.css`) réservé au Centre
 * d'attention : la couleur code enfin l'urgence, pas seulement le bleu de
 * marque partout (direction D du plan).
 */
const TETE = [
  { icon: Users, valeur: "247", detail: "élèves inscrits" },
  { icon: CalendarCheck, valeur: "94 %", detail: "de présence aujourd'hui" },
] as const;

const SECONDAIRES = [
  { icon: GraduationCap, valeur: "12,8/20", complement: "+0,3 pt", detail: "moyenne générale" },
  { icon: FolderCheck, valeur: "87 %", detail: "des dossiers complets" },
  { icon: Wallet, valeur: "78 %", detail: "des frais du trimestre encaissés" },
  { icon: Phone, valeur: "96 %", detail: "des familles joignables" },
] as const;

const ATTENTION = [
  "12 factures en retard de paiement",
  "4 admissions en attente de validation",
  "9 bulletins générés, pas encore lus par les familles",
  "1 classe sans enseignant titulaire",
];

export default function DirectorPilot() {
  return (
    <section id="pilotage" className="scroll-mt-20 bg-m-card">
      <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="max-w-2xl">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-m-ink-faint">
            Le pilotage
          </p>
          <h2 className="mt-4 font-display text-[1.625rem] font-semibold leading-[1.2] tracking-[-0.02em] text-m-ink sm:text-[2.125rem]">
            Vous ne devriez pas avoir à le demander à trois personnes.
          </h2>
          <p className="mt-4 text-[15px] leading-[1.65] text-m-ink-soft">
            Ce que la direction voit en ouvrant EduCom, sans appeler le secrétariat ni feuilleter
            un cahier.
          </p>
        </div>

        <div className="mt-8 rounded-[20px] bg-m-ink p-6 sm:p-8 lg:p-10">
          <div className="grid grid-cols-2 gap-6 border-b border-white/10 pb-6">
            {TETE.map((t) => (
              <div key={t.detail}>
                <t.icon aria-hidden="true" className="h-5 w-5 text-m-accent-bright" />
                <p className="mt-3 font-display text-[2.25rem] font-semibold leading-none tabular-nums text-white sm:text-[2.75rem]">
                  {t.valeur}
                </p>
                <p className="mt-2 text-[13.5px] text-white/55">{t.detail}</p>
              </div>
            ))}
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 border-b border-white/10 pb-6 sm:grid-cols-4">
            {SECONDAIRES.map((s) => (
              <div key={s.detail}>
                <dt className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-white/45">
                  <s.icon aria-hidden="true" className="h-3.5 w-3.5" />
                  {s.detail}
                </dt>
                <dd className="mt-1.5 text-[19px] font-semibold tabular-nums text-white">
                  {s.valeur}
                  {"complement" in s && (
                    <span className="ml-1.5 text-[12px] font-medium text-m-accent-bright">{s.complement}</span>
                  )}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-6">
            <h3 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.08em] text-m-alert-bright">
              <AlertTriangle aria-hidden="true" className="h-4 w-4" />
              Centre d&apos;attention — aujourd&apos;hui
            </h3>
            <ul className="mt-3 grid grid-cols-1 gap-x-8 gap-y-2.5 sm:grid-cols-2">
              {ATTENTION.map((a) => (
                <li key={a} className="flex gap-3 text-[13.5px] leading-relaxed text-white/70">
                  <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-m-alert-bright" />
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
