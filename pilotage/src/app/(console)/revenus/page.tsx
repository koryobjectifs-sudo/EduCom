import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { vueEnsemble } from "@/lib/donnees";
import { fcfa } from "@/lib/calculs";
import { type ClePeriode } from "@/lib/periode";
import { Barres, Bloc, EnTete, Kpi, PastilleStatut, ilYa } from "@/components/ui";
import FiltrePeriode from "@/components/FiltrePeriode";
import CourbeTendance from "@/components/charts/CourbeTendance";
import RepartitionMoyensPaiement from "@/components/charts/RepartitionMoyensPaiement";

const pct = (x: number | null) => (x === null ? "—" : `${Math.round(x * 100)} %`);

export default async function Revenus({
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

  const paiements = await prisma.subscriptionPayment.findMany({
    where: {
      createdAt: { gte: v.intervalle.debut, lte: v.intervalle.fin },
    },
    orderBy: { createdAt: "desc" },
    take: 60,
    select: {
      id: true,
      amountXof: true,
      months: true,
      status: true,
      provider: true,
      createdAt: true,
      paidAt: true,
      schoolId: true,
      school: { select: { name: true } },
    },
  });

  const r = v.revenus;
  const liste = (statuts: string[]) => v.ecoles.filter((e) => statuts.includes(e.statut));
  const colonnes: { titre: string; ecoles: typeof v.ecoles; valeur: (n: number) => string; aide: string }[] = [
    {
      titre: "Argent à récupérer",
      ecoles: liste(["EN_RETARD"]),
      valeur: (n) => fcfa(n * v.prix),
      aide: "Échéance dépassée depuis moins de 7 jours : un appel suffit souvent.",
    },
    {
      titre: "Essais qui finissent bientôt",
      ecoles: liste(["ESSAI"]).filter((e) => (e.joursRestants ?? 99) <= 3),
      valeur: (n) => fcfa(n * v.prix),
      aide: "À convertir cette semaine.",
    },
    {
      titre: "Clients perdus (churn)",
      ecoles: liste(["PERDUE"]),
      valeur: (n) => `${fcfa(n * v.prix)} / mois`,
      aide: "Ont payé puis n'ont pas renouvelé.",
    },
    {
      titre: "Essais non convertis",
      ecoles: liste(["NON_CONVERTIE"]),
      valeur: (n) => `${n} école${n > 1 ? "s" : ""}`,
      aide: "Jamais payé : comprendre pourquoi.",
    },
  ];

  return (
    <div className="space-y-4">
      {/* ═══ EN-TÊTE HARMONIEUX AVEC FILTRE TEMPOREL ═══ */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <EnTete
          titre="Revenus"
          sous={`Tarif officiel : ${fcfa(v.prix)} par école et par mois · filtre : ${v.intervalle.label}`}
        />
        <FiltrePeriode
          periodeActuelle={v.intervalle.cle as ClePeriode}
          debutActuel={sp.debut}
          finActuel={sp.fin}
        />
      </div>

      {/* ═══ KPIS REVENUS ═══ */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
        <Kpi libelle="MRR" valeur={fcfa(r.mrr)} detail={`ARR ${fcfa(r.mrr * 12)}`} ton="ok" />
        <Kpi libelle={`Encaissé (${v.intervalle.cle === "mois" ? "ce mois" : v.intervalle.label})`} valeur={fcfa(v.encaissePeriode)} detail="paiements confirmés" />
        <Kpi libelle="À récupérer" valeur={fcfa(r.aRecuperer)} ton={r.aRecuperer ? "warn" : undefined} detail="en retard" />
        <Kpi libelle="Perdu / mois" valeur={fcfa(r.perduParMois)} ton={r.perduParMois ? "bad" : undefined} detail={`churn ${pct(r.tauxChurn)}`} />
        <Kpi libelle="Potentiel essais" valeur={fcfa(r.potentielEssais)} detail={`${v.compte.ESSAI} en essai`} />
        <Kpi libelle="Conversion" valeur={pct(r.tauxConversion)} detail="essai → payant" />
      </div>

      {/* ═══ COURBE D'ENCAISSEMENT + RÉPARTITION DES MOYENS ═══ */}
      <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr]">
        <CourbeTendance
          points={v.seriesTemporelle.revenus}
          titre="Courbe d'encaissement réelle"
          sousTitre={`Total encaissé sur ${v.intervalle.label} : ${fcfa(v.encaissePeriode)}`}
          modeValeur="fcfa"
          couleur="violet"
        />

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

      {/* ═══ SEGMENTS COMMERCIAUX ═══ */}
      <div className="grid gap-3 md:grid-cols-2">
        {colonnes.map((c) => (
          <Bloc
            key={c.titre}
            titre={`${c.titre} · ${c.ecoles.length}`}
            actions={<span className="text-[12px] font-semibold text-text">{c.valeur(c.ecoles.length)}</span>}
          >
            <p className="mb-2 text-[11.5px] text-text-faint">{c.aide}</p>
            {c.ecoles.length === 0 ? (
              <p className="py-2 text-[12.5px] text-text-soft">Aucune.</p>
            ) : (
              <div className="divide-y divide-rule">
                {c.ecoles.map((e) => (
                  <Link
                    key={e.id}
                    href={`/ecoles/${e.id}`}
                    className="flex items-center justify-between gap-2 py-1.5 text-[12.5px] hover:bg-sunk rounded px-1 transition-colors"
                  >
                    <span className="truncate">
                      {e.nom}
                      <span className="text-text-faint">
                        {" "}· {e.proprietaire?.telephone ?? e.proprietaire?.email ?? "—"}
                      </span>
                    </span>
                    <PastilleStatut statut={e.statut} joursRestants={e.joursRestants} />
                  </Link>
                ))}
              </div>
            )}
          </Bloc>
        ))}
      </div>

      {/* ═══ TABLE DES DERNIERS PAIEMENTS SUR LA PÉRIODE ═══ */}
      <Bloc titre={`Transactions enregistrées sur la période (${paiements.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-rule text-left text-[11px] font-semibold uppercase tracking-wider text-text-faint">
                <th className="py-2">École</th>
                <th>Montant</th>
                <th>Durée</th>
                <th>Moyen</th>
                <th>Statut</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {paiements.map((p) => (
                <tr key={p.id} className="hover:bg-sunk transition-colors">
                  <td className="py-2 font-medium">
                    <Link className="hover:text-primary" href={`/ecoles/${p.schoolId}`}>
                      {p.school.name}
                    </Link>
                  </td>
                  <td className="tabular-nums font-semibold text-text">{fcfa(p.amountXof)}</td>
                  <td className="text-text-soft">{p.months} mois</td>
                  <td>
                    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10.5px] font-medium ${
                      p.provider === "WAVE"
                        ? "bg-sky-50 text-sky-700"
                        : p.provider === "ORANGE_MONEY"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-sunk text-text-soft"
                    }`}>
                      {p.provider === "MANUEL" ? "Manuel" : p.provider === "ORANGE_MONEY" ? "Orange Money" : "Wave"}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
                        p.status === "PAYE"
                          ? "bg-emerald-50 text-emerald-700"
                          : p.status === "EN_ATTENTE"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-rose-50 text-rose-700"
                      }`}
                    >
                      {p.status === "PAYE" ? "Payé" : p.status === "EN_ATTENTE" ? "En attente" : p.status === "EXPIRE" ? "Expiré" : "Échec"}
                    </span>
                  </td>
                  <td className="text-text-faint">{ilYa(p.paidAt ?? p.createdAt)}</td>
                </tr>
              ))}
              {!paiements.length && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-text-soft">
                    Aucun paiement enregistré sur la période sélectionnée ({v.intervalle.label}).
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Bloc>
    </div>
  );
}
