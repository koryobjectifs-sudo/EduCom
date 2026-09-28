import Link from "next/link";
import { lesEcoles } from "@/lib/donnees";
import { fcfa, LIBELLE_STATUT, type Statut, type EtapeAdoption } from "@/lib/calculs";
import { EnTete, PastilleStatut, PastilleAdoption, ilYa, plusVieuxQue } from "@/components/ui";

const FILTRES_COMMERCIAUX = [
  { id: "", nom: "Toutes les écoles" },
  { id: "PAYANTE", nom: "Payantes" },
  { id: "ESSAI", nom: "En essai" },
  { id: "EN_RETARD", nom: "En retard" },
  { id: "CHAMPIONS", nom: "🚀 Championnes" },
  { id: "SIGNAUX", nom: "⚠️ À surveiller" },
];

const FILTRES_ADOPTION: { id: EtapeAdoption; nom: string; motif: string }[] = [
  { id: "INSCRITE", nom: "🛑 0 classe créée", motif: "Bloquées à l'étape 1" },
  { id: "STRUCTURE", nom: "🛑 0 élève importé", motif: "Bloquées à l'étape 2" },
  { id: "ELEVES", nom: "🛑 0 note saisie", motif: "Bloquées à l'étape 3" },
  { id: "PEDAGOGIE", nom: "🛑 0 bulletin", motif: "Bloquées à l'étape 4" },
];

export default async function Ecoles({
  searchParams,
}: {
  searchParams: Promise<{ f?: string; etape?: string; q?: string }>;
}) {
  const { f = "", etape = "", q = "" } = await searchParams;
  const toutes = await lesEcoles();
  const recherche = q.trim().toLowerCase();

  const ecoles = toutes.filter((e) => {
    if (f === "SIGNAUX" && e.signaux.length === 0) return false;
    if (f === "CHAMPIONS" && !e.adoption.estChampionne) return false;
    if (f && f !== "SIGNAUX" && f !== "CHAMPIONS" && e.statut !== (f as Statut)) return false;
    if (etape && e.adoption.etapeActuelle !== etape) return false;
    if (
      recherche &&
      ![e.nom, e.ville, e.proprietaire?.nom, e.proprietaire?.email, e.proprietaire?.telephone].some((x) =>
        x?.toLowerCase().includes(recherche)
      )
    ) {
      return false;
    }
    return true;
  });

  const lien = (params: { f?: string; etape?: string }) => {
    const sp = new URLSearchParams();
    if (params.f !== undefined ? params.f : f) sp.set("f", (params.f !== undefined ? params.f : f)!);
    if (params.etape !== undefined ? params.etape : etape) sp.set("etape", (params.etape !== undefined ? params.etape : etape)!);
    if (q) sp.set("q", q);
    const s = sp.toString();
    return `/ecoles${s ? `?${s}` : ""}`;
  };

  return (
    <div className="space-y-4">
      <EnTete
        titre={
          <>
            Écoles{" "}
            <span className="text-text-faint">
              · {ecoles.length}
              {ecoles.length !== toutes.length ? ` sur ${toutes.length}` : ""}
            </span>
          </>
        }
        sous="Tour de contrôle du lancement : adoption réelle, goulots d'étranglement et coordonnées directes."
        actions={
          <form className="flex gap-1.5">
            {f && <input type="hidden" name="f" value={f} />}
            {etape && <input type="hidden" name="etape" value={etape} />}
            <input
              name="q"
              defaultValue={q}
              placeholder="Recherche école, directeur, tél…"
              className="h-8 w-64 rounded-lg border border-rule bg-surface px-2.5 text-[13px]"
            />
          </form>
        }
      />

      {/* Barres de filtres doubles : statut commercial + étape d'adoption */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-text-faint mr-1">Statut :</span>
          {FILTRES_COMMERCIAUX.map((x) => (
            <Link
              key={x.id}
              href={lien({ f: x.id, etape: "" })}
              className={`rounded-full border px-3 py-1 text-[12px] font-medium transition-colors ${
                f === x.id && !etape
                  ? "border-primary bg-primary text-white"
                  : "border-rule bg-surface text-text-soft hover:border-primary"
              }`}
            >
              {x.nom}
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-text-faint mr-1">Entonnoir :</span>
          {FILTRES_ADOPTION.map((x) => (
            <Link
              key={x.id}
              href={lien({ etape: x.id, f: "" })}
              className={`rounded-full border px-3 py-1 text-[11.5px] font-medium transition-colors ${
                etape === x.id
                  ? "border-amber-600 bg-amber-500/15 text-amber-900 font-bold"
                  : "border-rule bg-surface text-text-soft hover:border-amber-500"
              }`}
              title={x.motif}
            >
              {x.nom}
            </Link>
          ))}
          {(f || etape) && (
            <Link
              href="/ecoles"
              className="ml-2 text-[11px] text-text-faint hover:text-danger underline"
            >
              Réinitialiser les filtres
            </Link>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-rule bg-surface shadow-sm">
        <table className="w-full min-w-[1050px] text-[12.5px]">
          <thead>
            <tr className="border-b border-rule bg-sunk/30 text-left text-[11px] text-text-faint">
              {["École & Directeur", "Abonnement", "Adoption EduCom", "Structure", "Pédagogie", "Dernière activité", "Contact & Action"].map(
                (h) => (
                  <th key={h} className="whitespace-nowrap px-3 py-2 font-semibold">
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {ecoles.map((e) => {
              const tel = e.proprietaire?.telephone?.replace(/\D/g, "");
              return (
                <tr key={e.id} className="border-b border-sunk hover:bg-sunk/60 transition-colors">
                  <td className="px-3 py-2.5">
                    <Link href={`/ecoles/${e.id}`} className="font-semibold text-text hover:text-primary">
                      {e.nom}
                    </Link>
                    <div className="text-[11px] text-text-faint">
                      {e.proprietaire ? (
                        <span>
                          {e.proprietaire.nom} {e.proprietaire.telephone ? `· ${e.proprietaire.telephone}` : ""}
                        </span>
                      ) : (
                        "Aucun propriétaire assigné"
                      )}
                    </div>
                  </td>

                  <td className="px-3 py-2.5">
                    <PastilleStatut statut={e.statut} joursRestants={e.joursRestants} />
                  </td>

                  <td className="px-3 py-2.5">
                    <div className="space-y-1">
                      <PastilleAdoption adoption={e.adoption} />
                      <div className="text-[10.5px] text-text-faint leading-tight truncate max-w-[220px]">
                        {e.adoption.diagnostic}
                      </div>
                    </div>
                  </td>

                  <td className="px-3 py-2.5 tabular-nums">
                    <div>
                      <b>{e.eleves}</b> élèves
                    </div>
                    <div className="text-[11px] text-text-faint">
                      {e.classes} classes · {e.personnel} staff
                    </div>
                  </td>

                  <td className="px-3 py-2.5 tabular-nums">
                    <div>
                      <b>{e.notes30j}</b> notes
                    </div>
                    <div className="text-[11px] text-text-faint">
                      {e.bulletins} bulletins · {e.factures} factures
                    </div>
                  </td>

                  <td className={`px-3 py-2.5 ${plusVieuxQue(e.derniereActivite, 7) ? "text-danger" : ""}`}>
                    <div>{ilYa(e.derniereActivite)}</div>
                    {e.signaux.length > 0 && (
                      <div className="text-[10.5px] font-medium text-warning truncate max-w-[150px]">
                        ⚠️ {e.signaux[0]}
                      </div>
                    )}
                  </td>

                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      {tel ? (
                        <a
                          href={`https://wa.me/${tel}?text=${encodeURIComponent(e.adoption.messageWhatsApp)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg border border-emerald-600/30 bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-500/20"
                          title="Message WhatsApp pré-rempli selon le blocage de l'école"
                        >
                          WhatsApp
                        </a>
                      ) : null}
                      {e.proprietaire?.email ? (
                        <a
                          href={`mailto:${e.proprietaire.email}?subject=${encodeURIComponent(e.adoption.sujetEmail)}&body=${encodeURIComponent(e.adoption.messageEmail)}`}
                          className="rounded-lg border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary/20"
                          title="Envoyer un e-mail professionnel"
                        >
                          E-mail
                        </a>
                      ) : null}
                      <Link
                        href={`/ecoles/${e.id}`}
                        className="rounded-lg border border-rule bg-surface px-2 py-1 text-[11px] font-medium text-text-soft hover:bg-sunk"
                      >
                        Fiche 360° →
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!ecoles.length && (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-text-soft">
                  Aucune école ne correspond aux critères sélectionnés.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
