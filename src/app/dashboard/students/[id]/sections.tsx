import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import {
  Mail, Phone, MapPin, GraduationCap, Calendar, User as UserIcon, Activity,
  ReceiptText, FolderOpen, CheckCircle2, XCircle, Clock, ShieldCheck, MessageCircle, BookOpen,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/Badge";
import { formatAmount } from "@/lib/moneyFormat";
import type { Student360 } from "./data";

/* ═══════════════════ briques communes ═══════════════════ */

/** Carte de section : titre, filet, corps. Même en-tête partout. */
export function Bloc({
  title,
  action,
  children,
  className = "",
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-surface border border-rule bg-surface shadow-card ${className}`}>
      <div className="flex items-center justify-between gap-3 border-b border-rule px-5 py-3.5">
        <h2 className="text-role-card font-semibold text-text">{title}</h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

/**
 * Ligne libellé / valeur.
 *
 * ⚠️ L'icône est posée à même le texte, sans pastille de 32 px : la pastille
 * n'apportait aucune information et allongeait chaque ligne.
 */
export function Champ({
  icon: Icon,
  label,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-baseline gap-2.5">
      <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0 translate-y-0.5 text-text-faint" />
      <div className="min-w-0">
        <dt className="text-role-meta text-text-faint">{label}</dt>
        <dd className="text-role-body text-text break-words">{children}</dd>
      </div>
    </div>
  );
}

/**
 * Indicateur chiffré.
 *
 * ⚠️ `valeur` vaut `null` quand la donnée n'existe pas — et l'écran l'écrit
 * (« Aucun relevé »). Afficher « 0 % » de présence pour une école qui n'a jamais
 * fait l'appel serait un mensonge, et le pire des mensonges ici : celui qui
 * ressemble à une alerte.
 */
export function Stat({
  label,
  valeur,
  unite,
  aide,
  ton = "neutre",
}: {
  label: string;
  valeur: string | number | null;
  unite?: string;
  aide?: string;
  ton?: "neutre" | "bon" | "alerte" | "danger";
}) {
  const couleur =
    valeur === null
      ? "text-text-faint"
      : ton === "bon"
        ? "text-success"
        : ton === "alerte"
          ? "text-warning"
          : ton === "danger"
            ? "text-danger"
            : "text-text";
  return (
    <div className="rounded-control border border-rule bg-sunk px-3.5 py-3">
      <p className="text-role-meta text-text-faint">{label}</p>
      <p className={`mt-1 text-role-section font-semibold tabular-nums ${couleur}`}>
        {valeur === null ? "—" : valeur}
        {valeur !== null && unite ? <span className="ml-0.5 text-role-label font-medium text-text-faint">{unite}</span> : null}
      </p>
      {aide && <p className="mt-0.5 text-role-meta text-text-faint">{aide}</p>}
    </div>
  );
}

function Vide({ icon: Icon, children }: { icon: ComponentType<{ className?: string }>; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center">
      <Icon aria-hidden="true" className="h-7 w-7 text-text-faint" />
      <p className="text-role-body text-text-soft">{children}</p>
    </div>
  );
}

const jour = (d: Date) => new Date(d).toLocaleDateString("fr-FR");

const PRESENCE_LIBELLE: Record<string, { texte: string; icone: ComponentType<{ className?: string }>; classe: string }> = {
  PRESENT: { texte: "Présent", icone: CheckCircle2, classe: "text-success" },
  ABSENT: { texte: "Absent", icone: XCircle, classe: "text-danger" },
  LATE: { texte: "En retard", icone: Clock, classe: "text-warning" },
  EXCUSED: { texte: "Absence justifiée", icone: ShieldCheck, classe: "text-text-soft" },
};

const BULLETIN_LIBELLE: Record<string, string> = {
  DRAFT: "Brouillon", VALIDATED: "Validé", SUBMITTED: "Déposé",
  RETURNED: "Renvoyé", APPROVED: "Approuvé",
};

const NOTE_LIBELLE: Record<string, string> = {
  EXAM: "Composition", HOMEWORK: "Devoir", QUIZ: "Interrogation",
  PARTICIPATION: "Participation", OTHER: "Autre",
};

/* ═══════════════════ 1. VUE GÉNÉRALE ═══════════════════ */

/**
 * La seule section qui croise les trois signaux.
 *
 * ⚠️ C'est le cœur de l'apport : la recherche sur les systèmes scolaires est
 * unanime — voir la présence, les résultats et l'argent CÔTE À CÔTE est ce qui
 * permet d'intervenir avant que la situation ne s'installe. Ces trois chiffres
 * existaient dans la base et n'étaient réunis sur aucun écran.
 */
export function SectionApercu({ d, studentId }: { d: Student360; studentId: string }) {
  const moyenne = d.notes.moyenne;
  return (
    <div className="space-y-6">
      <Bloc title="Signaux de l'élève">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat
            label="Taux de présence"
            valeur={d.presences.taux}
            unite="%"
            aide={d.presences.total > 0 ? `${d.presences.total} jours relevés` : "Aucun relevé"}
            ton={d.presences.taux === null ? "neutre" : d.presences.taux >= 90 ? "bon" : d.presences.taux >= 75 ? "alerte" : "danger"}
          />
          <Stat
            label="Moyenne générale"
            valeur={moyenne === null ? null : moyenne.toFixed(1).replace(".", ",")}
            unite="/20"
            aide={d.notes.liste.length > 0 ? `${d.notes.liste.length} notes` : "Aucune note"}
            ton={moyenne === null ? "neutre" : moyenne >= 12 ? "bon" : moyenne >= 10 ? "alerte" : "danger"}
          />
          <Stat
            label="Reste à payer"
            valeur={formatAmount(d.finance.duCumule)}
            unite="FCFA"
            aide={d.finance.enRetard > 0 ? `${d.finance.enRetard} facture(s) en retard` : "Rien en retard"}
            ton={d.finance.enRetard > 0 ? "danger" : d.finance.duCumule > 0 ? "alerte" : "bon"}
          />
          <Stat
            label="Pièces au dossier"
            valeur={d.nbDocuments}
            aide={d.nbDocuments === 0 ? "Dossier vide" : "Pièces courantes"}
            ton={d.nbDocuments === 0 ? "alerte" : "neutre"}
          />
        </div>
      </Bloc>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <Bloc title="Dernières présences">
          {d.presences.recentes.length > 0 ? (
            <ul className="divide-y divide-rule">
              {d.presences.recentes.slice(0, 5).map((p) => {
                const l = PRESENCE_LIBELLE[p.status] ?? { texte: p.status, icone: Clock, classe: "text-text-soft" };
                const Icone = l.icone;
                return (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="text-role-body text-text tabular-nums">{jour(p.date)}</p>
                      {p.reason && <p className="text-role-meta text-text-faint break-words">{p.reason}</p>}
                    </div>
                    <span className={`flex shrink-0 items-center gap-1.5 text-role-label font-medium ${l.classe}`}>
                      <Icone aria-hidden="true" className="h-3.5 w-3.5" /> {l.texte}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Vide icon={Calendar}>Aucun appel enregistré pour cet élève.</Vide>
          )}
        </Bloc>

        <Bloc title="Dernières notes">
          {d.notes.liste.length > 0 ? (
            <ul className="divide-y divide-rule">
              {d.notes.liste.slice(0, 5).map((n) => (
                <li key={n.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-role-body font-medium text-text break-words">{n.subject?.name ?? "Sans matière"}</p>
                    <p className="text-role-meta text-text-faint">
                      {NOTE_LIBELLE[n.type] ?? n.type} · {jour(n.date)}
                    </p>
                  </div>
                  <span className="shrink-0 text-role-body font-semibold text-text tabular-nums">
                    {n.value.toLocaleString("fr-FR")}<span className="text-text-faint">/{n.max}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Vide icon={BookOpen}>Aucune note saisie pour cet élève.</Vide>
          )}
        </Bloc>
      </div>

      <Bloc
        title="Dernières factures"
        action={
          <Link
            href={`/dashboard/payments/invoice?studentId=${studentId}`}
            className="inline-flex items-center rounded-control px-2 py-1 text-role-label font-medium text-primary transition-colors hover:bg-sunk pointer-coarse:min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            Créer
          </Link>
        }
      >
        <ListeFactures factures={d.finance.factures.slice(0, 4)} />
      </Bloc>
    </div>
  );
}

/* ═══════════════════ 2. SCOLARITÉ ═══════════════════ */

export function SectionScolarite({ d }: { d: Student360 }) {
  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
      <Bloc title="Classe actuelle">
        {d.classeCourante ? (
          <dl className="space-y-3.5">
            <Champ icon={GraduationCap} label="Classe">{d.classeCourante.name}</Champ>
            <Champ icon={Calendar} label="Année scolaire">{d.student.enrollments[0]?.academicYear ?? "—"}</Champ>
            <Champ icon={UserIcon} label="Enseignant titulaire">
              {d.classeCourante.teacher
                ? `${d.classeCourante.teacher.firstName} ${d.classeCourante.teacher.lastName}`
                : "Aucun titulaire désigné"}
            </Champ>
          </dl>
        ) : (
          <Vide icon={GraduationCap}>Cet élève n&apos;est inscrit dans aucune classe.</Vide>
        )}
      </Bloc>

      <Bloc title="Matières de la classe">
        {d.matieres.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {d.matieres.map((m) => (
              <li key={m.id} className="rounded-pill border border-rule bg-sunk px-2.5 py-1 text-role-label text-text">
                {m.subject?.name ?? "Sans nom"}
              </li>
            ))}
          </ul>
        ) : (
          <Vide icon={BookOpen}>Aucune matière n&apos;est rattachée à cette classe.</Vide>
        )}
      </Bloc>

      <Bloc title="Historique des inscriptions" className="lg:col-span-2">
        {d.student.enrollments.length > 0 ? (
          <ul className="divide-y divide-rule">
            {d.student.enrollments.map((enr, i) => {
              // `enrollments` est trié par année décroissante et l'en-tête désigne
              // déjà la première comme la classe courante : le libellé suit la
              // même règle au lieu de la contredire.
              const enCours = i === 0;
              return (
                <li key={enr.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-role-body font-semibold text-text">{enr.class?.name}</p>
                    <p className="text-role-meta text-text-faint">Année {enr.academicYear}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-pill px-2 py-0.5 text-role-meta font-medium ${
                      enCours
                        ? "bg-primary/10 text-primary ring-1 ring-inset ring-primary/20"
                        : "border border-rule bg-sunk text-text-soft"
                    }`}
                  >
                    {enCours ? "En cours" : "Terminé"}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <Vide icon={GraduationCap}>Aucun historique d&apos;inscription.</Vide>
        )}
      </Bloc>
    </div>
  );
}

/* ═══════════════════ 3. PRÉSENCE ═══════════════════ */

export function SectionPresence({ d }: { d: Student360 }) {
  return (
    <div className="space-y-6">
      <Bloc title="Assiduité">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Présences" valeur={d.presences.total > 0 ? d.presences.present : null} ton="bon" />
          <Stat label="Absences" valeur={d.presences.total > 0 ? d.presences.absent : null} ton={d.presences.absent > 0 ? "danger" : "neutre"} />
          <Stat label="Retards" valeur={d.presences.total > 0 ? d.presences.retard : null} ton={d.presences.retard > 0 ? "alerte" : "neutre"} />
          <Stat label="Absences justifiées" valeur={d.presences.total > 0 ? d.presences.excuse : null} />
        </div>
        {d.presences.total === 0 && (
          <p className="mt-4 text-role-body text-text-soft">
            Aucun appel n&apos;a encore été enregistré pour cet élève.
          </p>
        )}
      </Bloc>

      <Bloc title="Relevé récent">
        {d.presences.recentes.length > 0 ? (
          <ul className="divide-y divide-rule">
            {d.presences.recentes.map((p) => {
              const l = PRESENCE_LIBELLE[p.status] ?? { texte: p.status, icone: Clock, classe: "text-text-soft" };
              const Icone = l.icone;
              return (
                <li key={p.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-role-body text-text tabular-nums">{jour(p.date)}</p>
                    <p className="text-role-meta text-text-faint">
                      {p.class?.name ?? "Sans classe"}
                      {p.reason ? ` · ${p.reason}` : ""}
                    </p>
                  </div>
                  <span className={`flex shrink-0 items-center gap-1.5 text-role-label font-medium ${l.classe}`}>
                    <Icone aria-hidden="true" className="h-3.5 w-3.5" /> {l.texte}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <Vide icon={Calendar}>Aucun appel enregistré pour cet élève.</Vide>
        )}
      </Bloc>
    </div>
  );
}

/* ═══════════════════ 4. NOTES ═══════════════════ */

export function SectionNotes({ d }: { d: Student360 }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <Bloc title="Moyenne par matière">
          {d.notes.parMatiere.length > 0 ? (
            <ul className="space-y-3">
              {d.notes.parMatiere.map((m) => (
                <li key={m.nom}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 text-role-body text-text break-words">{m.nom}</span>
                    <span className="shrink-0 text-role-body font-semibold text-text tabular-nums">
                      {m.moyenne.toFixed(1).replace(".", ",")}<span className="text-text-faint">/20</span>
                    </span>
                  </div>
                  {/* Barre de proportion : la moyenne sur 20, pas un objectif inventé. */}
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-pill bg-sunk">
                    <div
                      className={`h-full rounded-pill ${m.moyenne >= 12 ? "bg-success" : m.moyenne >= 10 ? "bg-warning" : "bg-danger"}`}
                      style={{ width: `${Math.max(0, Math.min(100, (m.moyenne / 20) * 100))}%` }}
                    />
                  </div>
                  <p className="mt-1 text-role-meta text-text-faint">{m.nombre} note{m.nombre > 1 ? "s" : ""}</p>
                </li>
              ))}
            </ul>
          ) : (
            <Vide icon={BookOpen}>Aucune note saisie pour cet élève.</Vide>
          )}
        </Bloc>

        <Bloc title="Bulletins">
          {d.bulletins.length > 0 ? (
            <ul className="divide-y divide-rule">
              {d.bulletins.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-role-body font-medium text-text">{b.term?.name ?? "Période"}</p>
                    <p className="text-role-meta text-text-faint">{b.class?.name ?? ""}</p>
                  </div>
                  <span className="shrink-0 rounded-pill border border-rule bg-sunk px-2 py-0.5 text-role-meta font-medium text-text-soft">
                    {BULLETIN_LIBELLE[b.status] ?? b.status}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Vide icon={BookOpen}>Aucun bulletin pour cet élève.</Vide>
          )}
        </Bloc>
      </div>

      <Bloc title="Notes récentes">
        {d.notes.liste.length > 0 ? (
          <ul className="divide-y divide-rule">
            {d.notes.liste.slice(0, 15).map((n) => (
              <li key={n.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-role-body font-medium text-text break-words">{n.subject?.name ?? "Sans matière"}</p>
                  <p className="text-role-meta text-text-faint">
                    {NOTE_LIBELLE[n.type] ?? n.type} · {n.term?.name ?? "—"} · {jour(n.date)}
                    {n.coefficient !== 1 ? ` · coef ${n.coefficient}` : ""}
                  </p>
                  {n.comment && <p className="mt-0.5 text-role-meta text-text-soft break-words">{n.comment}</p>}
                </div>
                <span className="shrink-0 text-role-body font-semibold text-text tabular-nums">
                  {n.value.toLocaleString("fr-FR")}<span className="text-text-faint">/{n.max}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <Vide icon={BookOpen}>Aucune note saisie pour cet élève.</Vide>
        )}
      </Bloc>
    </div>
  );
}

/* ═══════════════════ 5. FINANCE ═══════════════════ */

function ListeFactures({ factures }: { factures: Student360["finance"]["factures"] }) {
  if (factures.length === 0) return <Vide icon={ReceiptText}>Aucune facture enregistrée.</Vide>;
  return (
    <ul className="divide-y divide-rule">
      {factures.map((inv) => (
        <li key={inv.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
          <div className="min-w-0">
            <p className="text-role-body font-semibold text-text tabular-nums">{formatAmount(inv.totalAmount)} FCFA</p>
            <p className="text-role-meta text-text-faint break-words">
              {inv.title ? `${inv.title} · ` : ""}échéance {jour(inv.dueDate)}
            </p>
          </div>
          <StatusBadge domain="invoice" status={inv.status} size="sm" />
        </li>
      ))}
    </ul>
  );
}

export function SectionFinance({ d, studentId }: { d: Student360; studentId: string }) {
  return (
    <div className="space-y-6">
      <Bloc title="Situation financière">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <Stat
            label="Reste à payer"
            valeur={formatAmount(d.finance.duCumule)}
            unite="FCFA"
            ton={d.finance.duCumule > 0 ? "alerte" : "bon"}
          />
          <Stat
            label="Factures en retard"
            valeur={d.finance.enRetard}
            ton={d.finance.enRetard > 0 ? "danger" : "bon"}
          />
          <Stat label="Factures émises" valeur={d.finance.factures.length} />
        </div>
      </Bloc>

      <Bloc
        title="Toutes les factures"
        action={
          <Link
            href={`/dashboard/payments/invoice?studentId=${studentId}`}
            className="inline-flex items-center rounded-control px-2 py-1 text-role-label font-medium text-primary transition-colors hover:bg-sunk pointer-coarse:min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            Créer
          </Link>
        }
      >
        <ListeFactures factures={d.finance.factures} />
      </Bloc>
    </div>
  );
}

/* ═══════════════════ 6. FAMILLE & SANTÉ ═══════════════════ */

export function SectionFamille({ d, health }: { d: Student360; health: boolean }) {
  const p = d.student.parent;
  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
      <Bloc title="Responsable légal">
        {p ? (
          <div className="space-y-4">
            <div>
              <p className="text-role-section font-semibold text-text break-words">{p.firstName} {p.lastName}</p>
              <p className="mt-0.5 text-role-label text-text-soft">Parent / Tuteur</p>
            </div>
            <dl className="space-y-3">
              {p.email && (
                <div className="flex items-start gap-3">
                  <Mail aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-text-faint" />
                  <dd className="min-w-0 text-role-body text-text break-all">{p.email}</dd>
                </div>
              )}
              {p.phone && (
                <div className="flex items-start gap-3">
                  <Phone aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-text-faint" />
                  <dd className="min-w-0 text-role-body text-text">{p.phone}</dd>
                </div>
              )}
            </dl>
          </div>
        ) : (
          <Vide icon={UserIcon}>Aucun responsable légal assigné.</Vide>
        )}
      </Bloc>

      <Bloc title="Dossier médical &amp; urgence">
        {/* ⚠️ Le bloc médical n'est pas caché en CSS : il n'est pas rendu du tout.
            Un `hidden` laisserait la donnée dans la source de la page, donc
            lisible par qui n'y a pas droit. Le contact d'urgence, lui, reste
            affiché : joindre une famille pendant un incident fait partie du
            travail de tout le personnel. */}
        <div className="space-y-4">
          {health ? (
            <>
              <div>
                <p className="text-role-meta text-text-faint">Groupe sanguin</p>
                <p className="text-role-body font-semibold text-text">{d.student.bloodGroup || "Non renseigné"}</p>
              </div>
              <div>
                <p className="mb-1 text-role-meta text-text-faint">Notes médicales (allergies, PAI)</p>
                <p className="text-role-body text-text break-words">
                  {d.student.medicalNotes || "Aucune note médicale ou allergie signalée."}
                </p>
              </div>
            </>
          ) : (
            <p className="rounded-control border border-rule bg-sunk p-3 text-role-body text-text-soft">
              Les informations médicales relèvent du secrétariat et ne sont pas affichées ici.
            </p>
          )}

          <div className="border-t border-rule pt-3.5">
            <p className="mb-1.5 flex items-center gap-1.5 text-role-meta font-medium uppercase tracking-wide text-danger">
              <Activity aria-hidden="true" className="h-3 w-3" /> Contact en cas d&apos;urgence
            </p>
            <p className="text-role-body font-semibold text-text break-words">
              {d.student.emergencyContact || "Non renseigné"}
            </p>
            {d.student.emergencyPhone && <p className="text-role-body text-text-soft">{d.student.emergencyPhone}</p>}
          </div>
        </div>
      </Bloc>

      <Bloc title="Échanges avec la famille" className="lg:col-span-2">
        {d.conversations.length > 0 ? (
          <ul className="divide-y divide-rule">
            {d.conversations.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-role-body text-text">{c.parentWaNumber}</p>
                  <p className="text-role-meta text-text-faint">
                    Dernière activité le {jour(c.lastActivityAt)}
                    {c.detectedIntent ? ` · ${c.detectedIntent}` : ""}
                  </p>
                </div>
                <span className="shrink-0 rounded-pill border border-rule bg-sunk px-2 py-0.5 text-role-meta font-medium text-text-soft">
                  {c.status === "OPEN" ? "Ouverte" : "Fermée"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <Vide icon={MessageCircle}>Aucun échange WhatsApp rattaché à cet élève.</Vide>
        )}
      </Bloc>
    </div>
  );
}

/* ═══════════════════ 7. DOCUMENTS ═══════════════════ */

export function SectionDocuments({ d, studentId }: { d: Student360; studentId: string }) {
  return (
    <Bloc
      title="Dossier de l'élève"
      action={
        <Link
          href={`/dashboard/students/${studentId}/dossier`}
          className="inline-flex items-center gap-1.5 rounded-control px-2 py-1 text-role-label font-medium text-primary transition-colors hover:bg-sunk pointer-coarse:min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <FolderOpen aria-hidden="true" className="h-4 w-4" /> Ouvrir le dossier
        </Link>
      }
    >
      {/* ⚠️ Les pièces ne sont pas listées ici. Le dossier est un écran à part
          entière, avec sa checklist, ses catégories de permission et sa
          validation ; en recopier une liste partielle aurait créé une seconde
          vérité et laissé croire que tout le dossier tient sur cette fiche. */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Pièces courantes" valeur={d.nbDocuments} ton={d.nbDocuments === 0 ? "alerte" : "neutre"} />
          <Stat label="Photo de l'élève" valeur={d.student.photoPath ? "Oui" : "Non"} ton={d.student.photoPath ? "bon" : "neutre"} />
        </div>
        <p className="text-role-body text-text-soft">
          {d.nbDocuments === 0
            ? "Aucune pièce n'a encore été versée au dossier de cet élève."
            : "La checklist, la validation et le téléchargement des pièces se font dans le dossier."}
        </p>
      </div>
    </Bloc>
  );
}

/* ═══════════════════ volet permanent ═══════════════════ */

/**
 * Résumé de l'élève, visible dans TOUTES les sections.
 *
 * ⚠️ C'est la pièce que la fiche n'avait pas. Changer d'onglet faisait perdre
 * le contexte : on ne savait plus de quel élève on lisait les notes. Le volet
 * reprend l'idée du bandeau permanent de BambooHR, avec le contenu qui compte
 * pour une école — identité, classe, joignabilité de la famille.
 */
export function VoletEleve({ d, health }: { d: Student360; health: boolean }) {
  const s = d.student;
  // ⚠️ L'âge est calculé dans le chargement, pas ici : `Date.now()` pendant le
  // rendu est une lecture impure, que le linter React refuse à juste titre —
  // deux rendus du même composant pourraient ne pas donner le même âge.
  const age = d.age;

  return (
    <div className="space-y-6">
      <Bloc title="Résumé">
        <dl className="space-y-3.5">
          <Champ icon={Calendar} label="Date de naissance">
            {s.dateOfBirth ? `${jour(s.dateOfBirth)}${age !== null ? ` · ${age} ans` : ""}` : "Non renseignée"}
          </Champ>
          {s.gender && <Champ icon={UserIcon} label="Genre">{s.gender}</Champ>}
          <Champ icon={MapPin} label="Adresse">{s.address || "Non renseignée"}</Champ>
          <Champ icon={GraduationCap} label="Inscription">
            Enregistré le {jour(s.createdAt)}
          </Champ>
        </dl>
      </Bloc>

      <Bloc title="Joindre la famille">
        {s.parent ? (
          <dl className="space-y-3.5">
            <Champ icon={UserIcon} label="Responsable légal">
              {s.parent.firstName} {s.parent.lastName}
            </Champ>
            {s.parent.phone && <Champ icon={Phone} label="Téléphone">{s.parent.phone}</Champ>}
            {s.parent.email && (
              <div className="flex items-baseline gap-2.5">
                <Mail aria-hidden="true" className="h-3.5 w-3.5 shrink-0 translate-y-0.5 text-text-faint" />
                <div className="min-w-0">
                  <dt className="text-role-meta text-text-faint">Email</dt>
                  <dd className="text-role-body text-text break-all">{s.parent.email}</dd>
                </div>
              </div>
            )}
          </dl>
        ) : (
          <p className="text-role-body text-text-soft">Aucun responsable légal assigné.</p>
        )}

        <div className="mt-4 border-t border-rule pt-3.5">
          <p className="mb-1.5 flex items-center gap-1.5 text-role-meta font-medium uppercase tracking-wide text-danger">
            <Activity aria-hidden="true" className="h-3 w-3" /> Urgence
          </p>
          <p className="text-role-body font-semibold text-text break-words">{s.emergencyContact || "Non renseigné"}</p>
          {s.emergencyPhone && <p className="text-role-body text-text-soft">{s.emergencyPhone}</p>}
          {health && s.bloodGroup && (
            <p className="mt-1.5 text-role-label text-text-soft">
              Groupe sanguin <span className="font-semibold text-text">{s.bloodGroup}</span>
            </p>
          )}
          {/* ⚠️ Le volet est visible dans TOUTES les sections. Sans cette ligne,
              un acteur sans droit médical y verrait le contact d'urgence sans
              groupe sanguin et croirait la donnée absente, alors qu'elle est
              seulement retenue — un mensonge par omission. La mention voyage
              donc avec le volet, et pas seulement dans « Famille & santé ». */}
          {!health && (
            <p className="mt-1.5 text-role-meta text-text-faint">
              Les informations médicales relèvent du secrétariat.
            </p>
          )}
        </div>
      </Bloc>
    </div>
  );
}
