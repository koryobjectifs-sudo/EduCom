import Link from "next/link";
import { notFound } from "next/navigation";
import { ficheEcole } from "@/lib/donnees";
import { fcfa } from "@/lib/calculs";
import { PRO_PRICE_XOF } from "@/lib/abonnement";
import { roleLabel } from "@/lib/educom";
import { Bloc, Kpi, PastilleStatut, ilYa } from "@/components/ui";
import Gestes from "./Gestes";
import BlocsMetiers from "./BlocsMetiers";
import BoutonRembourser from "./BoutonRembourser";
import {
  Mail,
  Phone,
  MapPin,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";

const STATUT_PAIEMENT: Record<string, string> = {
  PAYE: "Payé",
  EN_ATTENTE: "En attente",
  REMBOURSE: "Remboursé",
  ANNULE: "Annulé",
  ECHEC: "Échec",
  EXPIRE: "Expiré",
};
const LIBELLE_ACTION: Record<string, string> = {
  create: "création",
  update: "modification",
  delete: "suppression",
  invite: "invitation",
  offrir_jours: "jours offerts",
  paiement_manuel: "paiement enregistré",
  renvoyer_acces: "accès renvoyé",
};

export default async function FicheEcole({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const f = await ficheEcole(id);
  if (!f || !f.ligne) notFound();

  const { ecole, ligne, abo } = f;
  const contact = ligne.proprietaire;
  const telDirect = contact?.telephone || ecole.phone || null;
  const emailDirect = contact?.email || ecole.email || null;
  const nomResponsable = contact?.nom || "Direction de l'école";
  const ad = ligne.adoption;

  return (
    <div className="space-y-4">
      <Link
        href="/ecoles"
        className="inline-flex items-center gap-1 text-[12px] font-medium text-text-soft hover:text-primary"
      >
        ← Retour aux écoles
      </Link>

      {/* ═══ 1. CARTE D'IDENTITÉ COMPLÈTE & CONTACTS OFFICIELS ═══ */}
      <div className="rounded-xl border border-rule bg-surface p-4 shadow-xs">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight text-text">
                {ecole.name}
              </h1>
              <PastilleStatut
                statut={ligne.statut}
                joursRestants={ligne.joursRestants}
              />
              {f.auditMetiers.statutGlobal === "BLOQUANT" && (
                <span className="rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-0.5 text-[10.5px] font-bold text-rose-700">
                  🛑 Configuration bloquante
                </span>
              )}
            </div>

            {/* Coordonnées & Contacts essentiels */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-text-soft">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-text-faint" />
                <span>{ecole.address || "Adresse non renseignée"}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-text-faint" />
                {telDirect ? (
                  <span className="font-semibold text-text">{telDirect}</span>
                ) : (
                  <span className="text-rose-600">Téléphone manquant</span>
                )}
              </span>
              <span className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-text-faint" />
                {emailDirect ? (
                  <span className="font-semibold text-text">{emailDirect}</span>
                ) : (
                  <span className="text-rose-600">E-mail manquant</span>
                )}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-text-faint" />
                <span>Inscrite le {ecole.createdAt.toLocaleDateString("fr-FR")}</span>
              </span>
            </div>

            {/* Métadonnées administratives */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-[11.5px] text-text-faint">
              <span>
                👤 <b>Responsable :</b>{" "}
                <span className="font-medium text-text">{nomResponsable}</span>
              </span>
              <span>·</span>
              <span>
                🎓 <b>Année active :</b>{" "}
                {ecole.activeAcademicYear ? (
                  <span className="font-semibold text-text">
                    {ecole.activeAcademicYear}
                  </span>
                ) : (
                  <span className="font-semibold text-rose-600">
                    🛑 Non déclarée
                  </span>
                )}
              </span>
              <span>·</span>
              <span>
                🏛️ <b>Administration :</b>{" "}
                {[ecole.inspectionAcademique, ecole.inspectionIEF]
                  .filter(Boolean)
                  .join(" / ") || "Non renseigné"}
              </span>
            </div>
          </div>

          {/* Boutons d'action rapides */}
          <div className="flex shrink-0 items-center gap-2">
            {telDirect && (
              <a
                href={`https://wa.me/${telDirect.replace(/\D/g, "")}?text=${encodeURIComponent(
                  ad.messageWhatsApp
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600/30 bg-emerald-500/10 px-3 py-2 text-[12px] font-semibold text-emerald-700 hover:bg-emerald-500/20 shadow-xs"
                title="Ouvrir WhatsApp avec message personnalisé"
              >
                💬 WhatsApp
              </a>
            )}
            {emailDirect && (
              <a
                href={`mailto:${emailDirect}?subject=${encodeURIComponent(
                  ad.sujetEmail
                )}&body=${encodeURIComponent(ad.messageEmail)}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-[12px] font-semibold text-primary hover:bg-primary/20 shadow-xs"
                title="Envoyer un e-mail officiel pré-rempli"
              >
                ✉️ E-mail officiel →
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ═══ 2. AUDIT DE CONFIGURATION PAR MÉTIER (DIRECTION, PÉDAGOGIE, SECRÉTARIAT, COMPTABILITÉ) ═══ */}
      <BlocsMetiers audit={f.auditMetiers} tel={telDirect} email={emailDirect} />

      {/* ═══ 3. JALONS VISUELS D'ADOPTION DE LANCEMENT ═══ */}
      <div className="rounded-xl border border-rule bg-surface p-3.5 space-y-2.5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-bold uppercase tracking-wider text-text-soft">
              Parcours d&apos;Adoption EduCom
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                ad.estChampionne
                  ? "bg-emerald-500/15 text-emerald-700"
                  : "bg-primary/10 text-primary"
              }`}
            >
              {ad.estChampionne
                ? "🚀 Championne (100 %)"
                : `Niveau ${ad.score}/5 (${ad.pourcentage} %)`}
            </span>
          </div>
          <span className="text-[11.5px] font-semibold text-text">
            {ad.labelEtape}
          </span>
        </div>

        {/* 5 Jalons visuels */}
        <div className="grid grid-cols-5 gap-1.5 pt-1">
          {[
            {
              n: 1,
              nom: "Inscription",
              fait: ad.etapes.inscrite,
              detail: ecole.createdAt.toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "short",
              }),
            },
            {
              n: 2,
              nom: "Classes",
              fait: ad.etapes.structure,
              detail: `${f.classes} classe${f.classes > 1 ? "s" : ""}`,
            },
            {
              n: 3,
              nom: "Élèves",
              fait: ad.etapes.eleves,
              detail: `${f.studentsCount} élève${f.studentsCount > 1 ? "s" : ""}`,
            },
            {
              n: 4,
              nom: "Notes",
              fait: ad.etapes.pedagogie,
              detail: `${ligne.notes30j} note${ligne.notes30j > 1 ? "s" : ""}`,
            },
            {
              n: 5,
              nom: "Valeur",
              fait: ad.etapes.valeur,
              detail: `${f.bulletinsCount} b. · ${f.facturesCount} f.`,
            },
          ].map((j) => (
            <div
              key={j.n}
              className={`rounded-lg border p-2 text-center transition-all ${
                j.fait
                  ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-900"
                  : j.n === ad.score
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-900 font-medium ring-1 ring-amber-500/30"
                  : "border-rule/50 bg-sunk/40 text-text-faint opacity-60"
              }`}
            >
              <div className="text-[10px] font-bold uppercase">
                {j.fait
                  ? "✓ Fait"
                  : j.n === ad.score
                  ? "🛑 Étape actuelle"
                  : "À venir"}
              </div>
              <div className="text-[12px] font-semibold truncate">{j.nom}</div>
              <div className="text-[10.5px] opacity-80 truncate">{j.detail}</div>
            </div>
          ))}
        </div>

        {/* Diagnostic & Action conseillée */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-rule/60 pt-2 text-[12px]">
          <p className="text-text-soft">
            <b className="text-text">Diagnostic :</b> {ad.diagnostic}
          </p>
          <p className="font-medium text-primary">
            💡 <b>Action conseillée :</b> {ad.actionRecommandee}
          </p>
        </div>
      </div>

      {/* ═══ 4. METRIQUES CLÉS DU PARC ═══ */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
        <Kpi libelle="Élèves inscrits" valeur={f.studentsCount} />
        <Kpi libelle="Classes" valeur={f.classes} />
        <Kpi
          libelle="Personnel"
          valeur={ligne.personnel}
          detail={`${ligne.actifs7j} actif${ligne.actifs7j > 1 ? "s" : ""} 7 j`}
        />
        <Kpi
          libelle="Professeurs assignés"
          valeur={`${f.profsAssignesUniques} profs`}
          detail={
            f.classesSansProfCount > 0
              ? `${f.classesSansProfCount} classe(s) orpheline(s)`
              : "toutes couvertes"
          }
          ton={f.classesSansProfCount > 0 ? "bad" : "ok"}
        />
        <Kpi
          libelle="Notes (30 j)"
          valeur={ligne.notes30j}
          ton={ligne.notes30j ? undefined : "bad"}
          detail={
            ligne.notes30j
              ? `${f.bulletinsCount} bulletin(s)`
              : "aucune note saisie"
          }
        />
        <Kpi
          libelle="Factures émises"
          valeur={f.facturesCount}
          detail={fcfa(f.invoicesTotal)}
        />
      </div>

      {/* ═══ 5. STRUCTURE DES CLASSES DE L'ÉCOLE (INSPECTION PÉDAGOGIQUE) ═══ */}
      {f.classesList.length > 0 && (
        <Bloc
          titre={`Classes & Structure Pédagogique (${f.classesList.length})`}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12.5px]">
              <thead className="border-b border-rule bg-sunk/40 text-[11px] font-semibold uppercase text-text-soft">
                <tr>
                  <th className="px-3 py-2">Classe</th>
                  <th className="px-3 py-2">Cycle</th>
                  <th className="px-3 py-2">Élèves</th>
                  <th className="px-3 py-2">Affectation Enseignants</th>
                  <th className="px-3 py-2">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {f.classesList.map((c) => {
                  const hasProf = c._count.assignments > 0;
                  return (
                    <tr key={c.id} className="hover:bg-sunk/30">
                      <td className="px-3 py-2 font-bold text-text">{c.name}</td>
                      <td className="px-3 py-2 text-text-soft">{c.cycle}</td>
                      <td className="px-3 py-2 font-semibold">
                        {c._count.enrollments} élève
                        {c._count.enrollments > 1 ? "s" : ""}
                      </td>
                      <td className="px-3 py-2">
                        {hasProf ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-medium text-[11.5px]">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {c._count.assignments} affectation(s)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-700 font-bold text-[11.5px]">
                            <XCircle className="h-3.5 w-3.5" />0 prof assigné 🛑
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-text-soft">
                        {c._count.grades} note{c._count.grades > 1 ? "s" : ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Bloc>
      )}

      {ligne.signaux.length > 0 && (
        <p className="rounded-xl border border-warning/30 bg-warning/5 px-3 py-2 text-[13px] text-text">
          ⚠️ <b>À surveiller :</b> {ligne.signaux.join(" · ")}
        </p>
      )}

      {f.erreursRecentes && f.erreursRecentes.length > 0 && (
        <div className="rounded-xl border border-danger/30 bg-danger/5 p-3 text-[12px] text-text">
          <p className="font-bold text-danger">
            ⚠️ {f.erreursRecentes.length} erreur(s) serveur récente(s) sur cette
            école :
          </p>
          <ul className="mt-1 divide-y divide-danger/15">
            {f.erreursRecentes.map((err) => (
              <li key={err.id} className="py-1 flex justify-between gap-2">
                <span className="font-mono text-[11px] truncate max-w-md">
                  {err.path} — {err.message}
                </span>
                <span className="shrink-0 text-text-faint">
                  {ilYa(err.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ═══ 6. ABONNEMENT, GESTES, PAIEMENTS, ÉQUIPE & ACTIVITÉ ═══ */}
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="space-y-3">
          <Bloc titre="Abonnement & Facturation EduCom">
            <div className="mb-2 grid grid-cols-2 gap-1 text-[12.5px]">
              <span className="text-text-soft">Fin d&apos;essai</span>
              <span>
                {abo ? abo.trialEndsAt.toLocaleDateString("fr-FR") : "—"}
              </span>
              <span className="text-text-soft">Payé jusqu&apos;au</span>
              <span>
                {abo?.currentPeriodEnd
                  ? abo.currentPeriodEnd.toLocaleDateString("fr-FR")
                  : "—"}
              </span>
              <span className="text-text-soft">Échéance</span>
              <span>
                {ligne.echeance
                  ? `${ligne.echeance.toLocaleDateString("fr-FR")} (${
                      ligne.joursRestants! >= 0
                        ? `dans ${ligne.joursRestants} j`
                        : `dépassée de ${-ligne.joursRestants!} j`
                    })`
                  : "—"}
              </span>
              <span className="text-text-soft">Tarif</span>
              <span>{fcfa(PRO_PRICE_XOF)} / mois</span>
            </div>
            <Gestes
              schoolId={ecole.id}
              prix={PRO_PRICE_XOF}
              proprietaire={
                contact
                  ? { id: ecole.id, email: contact.email }
                  : null
              }
            />
          </Bloc>

          <Bloc titre={`Paiements reçus · ${f.paiements.length}`}>
            {f.paiements.length === 0 ? (
              <p className="text-[12.5px] text-text-soft">Aucun paiement.</p>
            ) : (
              <ul className="divide-y divide-rule text-[12.5px]">
                {f.paiements.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-2 py-1.5"
                  >
                    <span>
                      {fcfa(p.amountXof)} · {p.months} mois ·{" "}
                      {p.provider === "MANUEL" ? "manuel" : "Wave"}
                      <span className="text-text-faint">
                        {" "}
                        · {(p.paidAt ?? p.createdAt).toLocaleDateString("fr-FR")}
                      </span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[11px] font-semibold ${
                          p.status === "PAYE"
                            ? "text-success"
                            : p.status === "EN_ATTENTE"
                            ? "text-warning"
                            : p.status === "REMBOURSE"
                            ? "text-danger"
                            : "text-text-faint"
                        }`}
                      >
                        {STATUT_PAIEMENT[p.status] ?? p.status}
                      </span>
                      {p.status === "PAYE" && (
                        <BoutonRembourser paiementId={p.id} montant={p.amountXof} />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Bloc>

          <Bloc titre={`Demandes de support · ${f.tickets.length}`}>
            {f.tickets.length === 0 ? (
              <p className="text-[12.5px] text-text-soft">Aucune demande.</p>
            ) : (
              f.tickets.map((t) => (
                <Link
                  key={t.id}
                  href={`/support?t=${t.id}`}
                  className="flex justify-between gap-2 py-1 text-[12.5px] hover:bg-sunk"
                >
                  <span className="truncate">{t.subject}</span>
                  <span className="shrink-0 text-text-faint">
                    {t.status === "RESOLU"
                      ? "résolue"
                      : t.status === "EN_COURS"
                      ? "en cours"
                      : "ouverte"}{" "}
                    · {ilYa(t.lastMessageAt)}
                  </span>
                </Link>
              ))
            )}
          </Bloc>
        </div>

        <div className="space-y-3">
          <Bloc titre={`Personnel & Équipe · ${f.membres.length}`}>
            {f.membres.length === 0 ? (
              <p className="text-[12.5px] text-text-soft">
                Aucun membre d&apos;équipe enregistré.
              </p>
            ) : (
              <ul className="divide-y divide-rule text-[12.5px]">
                {f.membres.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center justify-between gap-2 py-1.5"
                  >
                    <span className="min-w-0">
                      <b>
                        {m.firstName} {m.lastName}
                      </b>{" "}
                      <span className="text-text-faint">
                        · {roleLabel(m.role)}
                      </span>
                      <div className="truncate text-[11px] text-text-faint">
                        {m.email}
                        {m.phone ? ` · ${m.phone}` : ""}
                      </div>
                    </span>
                    <span className="shrink-0 text-[11px] text-text-faint">
                      {ilYa(m.derniereActivite)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Bloc>

          <Bloc titre="Activité récente">
            {f.journal.length === 0 ? (
              <p className="text-[12.5px] text-text-soft">
                Aucune activité enregistrée.
              </p>
            ) : (
              <ul className="max-h-96 divide-y divide-rule overflow-y-auto text-[12px]">
                {f.journal.map((j) => (
                  <li key={j.id} className="flex justify-between gap-2 py-1">
                    <span className="min-w-0 truncate">
                      <b>{j.auteur}</b> · {LIBELLE_ACTION[j.action] ?? j.action} ·{" "}
                      <span className="text-text-soft">{j.entity}</span>
                    </span>
                    <span className="shrink-0 text-text-faint">
                      {ilYa(j.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Bloc>
        </div>
      </div>
    </div>
  );
}
