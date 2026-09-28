import Link from "next/link";
import { vueEnsemble } from "@/lib/donnees";
import { fcfa } from "@/lib/calculs";
import { type ClePeriode } from "@/lib/periode";
import { Barres, Bloc, EnTete, EntonnoirVisuel, Kpi, PastilleStatut, ilYa } from "@/components/ui";
import FiltrePeriode from "@/components/FiltrePeriode";
import GraphiqueMultiMetriques from "@/components/charts/GraphiqueMultiMetriques";
import RepartitionMoyensPaiement from "@/components/charts/RepartitionMoyensPaiement";
import CockpitTaches from "@/components/CockpitTaches";

const pct = (x: number | null) => (x === null ? "—" : `${Math.round(x * 100)} %`);

export default async function VueEnsemble({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string; debut?: string; fin?: string }>;
}) {
  const sp = await searchParams;
  const v = await vueEnsemble({
    periode: sp.periode,
    debut: sp.debut,
    fin: sp.fin,
  });

  const c = v.compte;

  return (
    <div className="space-y-4">
      {/* ═══ EN-TÊTE HARMONIEUX AVEC FILTRE TEMPOREL ═══ */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <EnTete
          titre="Vue d'ensemble"
          sous={`${v.ecoles.length} écoles · filtre : ${v.intervalle.label}`}
        />
        <FiltrePeriode
          periodeActuelle={v.intervalle.cle as ClePeriode}
          debutActuel={sp.debut}
          finActuel={sp.fin}
        />
      </div>

      {/* ═══ 6 KPIS ESSENTIELS ═══ */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
        <Kpi
          libelle="Revenu mensuel (MRR)"
          valeur={fcfa(v.revenus.mrr)}
          detail={`${c.PAYANTE} école${c.PAYANTE > 1 ? "s" : ""} payante${c.PAYANTE > 1 ? "s" : ""}`}
          ton="ok"
          href="/ecoles?f=PAYANTE"
        />
        <Kpi
          libelle={`Encaissé (${v.intervalle.cle === "mois" ? "ce mois" : v.intervalle.label})`}
          valeur={fcfa(v.encaissePeriode)}
          detail="paiements confirmés"
          href="/revenus"
        />
        <Kpi
          libelle="À récupérer"
          valeur={fcfa(v.revenus.aRecuperer)}
          detail={`${c.EN_RETARD} en retard de paiement`}
          ton={c.EN_RETARD ? "warn" : undefined}
          href="/ecoles?f=EN_RETARD"
        />
        <Kpi
          libelle="Nouvelles écoles"
          valeur={`+${v.inscriptionsPeriode}`}
          detail={`sur la période`}
          ton="ok"
          href="/ecoles"
        />
        <Kpi
          libelle="En essai actif"
          valeur={c.ESSAI}
          detail={`potentiel ${fcfa(v.revenus.potentielEssais)}`}
          href="/ecoles?f=ESSAI"
        />
        <Kpi
          libelle="Conversion essai → payant"
          valeur={pct(v.revenus.tauxConversion)}
          detail={`${c.NON_CONVERTIE} non convertie${c.NON_CONVERTIE > 1 ? "s" : ""}`}
          href="/ecoles?f=PAYANTE"
        />
      </div>

      {/* ═══ ACTIONS PRIORITAIRES DU JOUR ═══ */}
      <CockpitTaches
        taches={{
          orphelines: v.tachesPrioritaires.orphelines,
          finEssai: v.tachesPrioritaires.finEssai,
          silencieuses: v.tachesPrioritaires.silencieuses,
          ticketsNonLus: v.ticketsNonLus,
          paiementsEnAttente: v.paiementsEnAttente,
          erreurs24h: v.erreurs24h,
        }}
      />

      {/* ═══ COURBES D'ACTIVITÉ & MOYENS D'ENCAISSEMENT ═══ */}
      <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr]">
        <Bloc titre="Activité & Encaissements">
          <GraphiqueMultiMetriques
            series={v.seriesTemporelle}
            periodeLabel={v.intervalle.label}
          />
        </Bloc>

        <div className="space-y-3">
          <RepartitionMoyensPaiement repartition={v.repartitionMoyens} />

          <Bloc titre="Historique 6 derniers mois">
            <Barres
              points={v.parMois.map((m) => ({ libelle: m.mois, valeur: m.montant }))}
              format={(n) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(n))}
            />
          </Bloc>
        </div>
      </div>

      {/* ═══ ENTONNOIR D'ADOPTION DU LANCEMENT ═══ */}
      <div className="grid gap-3 lg:grid-cols-[1.3fr_1fr]">
        <Bloc
          titre={
            <div className="flex items-center justify-between">
              <span>Entonnoir d&apos;Adoption du Lancement</span>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                {v.funnel.championsCount} championne{v.funnel.championsCount > 1 ? "s" : ""} 🚀
              </span>
            </div>
          }
        >
          <p className="mb-3 text-[12px] text-text-soft">
            Suivi étape par étape : voyez exactement où chaque école s&apos;arrête pour la débloquer proactivement.
          </p>
          <EntonnoirVisuel etapes={v.funnel.etapes} ecolesTotal={v.ecoles.length} />
        </Bloc>

        <div className="space-y-3">
          <Bloc titre={`Écoles Championnes 🚀 (${v.champions.length})`}>
            {v.champions.length === 0 ? (
              <p className="py-4 text-center text-[12.5px] text-text-soft">Aucune école n&apos;a encore terminé l&apos;adoption complète.</p>
            ) : (
              <ul className="divide-y divide-rule text-[12.5px]">
                {v.champions.slice(0, 4).map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-2 py-2">
                    <div className="min-w-0">
                      <Link href={`/ecoles/${e.id}`} className="font-semibold text-text hover:text-primary">
                        {e.nom}
                      </Link>
                      <div className="text-[11px] text-text-faint">
                        {e.eleves} élèves · {e.notes30j} notes · {e.bulletins} bulletins
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10.5px] font-bold text-emerald-700">
                      Top adoption
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Bloc>

          <Bloc titre={`À relancer en priorité (${v.bloquees.length})`}>
            <ul className="divide-y divide-rule text-[12.5px]">
              {v.bloquees.slice(0, 4).map((e) => {
                const tel = e.proprietaire?.telephone?.replace(/\D/g, "");
                return (
                  <li key={e.id} className="flex items-center justify-between gap-2 py-2">
                    <div className="min-w-0">
                      <Link href={`/ecoles/${e.id}`} className="font-semibold text-text hover:text-primary">
                        {e.nom}
                      </Link>
                      <div className="text-[11px] text-amber-700">
                        🛑 {e.adoption.labelEtape}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {tel && (
                        <a
                          href={`https://wa.me/${tel}?text=${encodeURIComponent(e.adoption.messageWhatsApp)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg border border-emerald-600/30 bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-500/20"
                          title="Ouvrir WhatsApp avec message personnalisé"
                        >
                          WhatsApp
                        </a>
                      )}
                      {e.proprietaire?.email && (
                        <a
                          href={`mailto:${e.proprietaire.email}?subject=${encodeURIComponent(e.adoption.sujetEmail)}&body=${encodeURIComponent(e.adoption.messageEmail)}`}
                          className="rounded-lg border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary/20"
                          title="Envoyer un e-mail professionnel pré-rempli"
                        >
                          E-mail →
                        </a>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Bloc>
        </div>
      </div>

      {/* ═══ STATUTS DU PARC & USAGE RÉEL ═══ */}
      <div className="grid gap-3 lg:grid-cols-3">
        <Bloc titre="Parc d'écoles (Abonnement)">
          {(["PAYANTE", "ESSAI", "EN_RETARD", "PERDUE", "NON_CONVERTIE", "INCONNU"] as const).map((s) => (
            <Link key={s} href={`/ecoles?f=${s}`} className="flex items-center justify-between py-1 text-[13px] hover:bg-sunk">
              <PastilleStatut statut={s} />
              <b className="tabular-nums">{c[s]}</b>
            </Link>
          ))}
        </Bloc>
        <Bloc titre="Usage réel (écoles actives)">
          {[
            ["Classes créées", v.activation.total],
            ["Élèves importés", v.activation.eleves],
            ["Notes saisies ce mois", v.activation.notes],
            ["Bulletins générés", v.activation.bulletins],
          ].map(([l, n]) => (
            <div key={l as string} className="flex justify-between py-1 text-[13px]">
              <span>{l}</span>
              <b className="tabular-nums">{n} / {v.activation.total}</b>
            </div>
          ))}
          <div className="mt-1 flex justify-between border-t border-rule pt-1.5 text-[13px]">
            <span>Personnel actif 7 j</span>
            <b className="tabular-nums">{v.actifs7j} / {v.utilisateurs}</b>
          </div>
        </Bloc>
        <Bloc titre="Dernières inscriptions">
          {v.ecoles.slice(0, 6).map((e) => (
            <Link key={e.id} href={`/ecoles/${e.id}`} className="flex items-center justify-between gap-2 py-1 text-[13px] hover:bg-sunk">
              <span className="truncate">{e.nom}</span>
              <span className="shrink-0 text-[11px] text-text-faint">{ilYa(e.creeLe)}</span>
            </Link>
          ))}
        </Bloc>
      </div>
    </div>
  );
}
