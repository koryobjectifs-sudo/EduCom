import { prisma } from "@/lib/prisma";
import { PRO_PRICE_XOF } from "@/lib/abonnement";
import {
  compterStatuts,
  revenus,
  signaux,
  statutEcole,
  type Statut,
  calculerAdoption,
  calculerFunnelLancement,
  evaluerMetiersEcole,
  type InfoAdoption,
  type FunnelLancement,
  type AuditMetiersEcole,
} from "@/lib/calculs";

/**
 * Outil de pilotage — lectures (27 sept. 2026).
 *
 * ⚠️ Lectures TRANS-ÉCOLES par construction : ce module n'est appelé que
 * derrière `exigerPilotePage()` / `pilote()`. Ne jamais l'importer depuis
 * un écran d'école.
 *
 * Tout est recalculé à chaque ouverture (données réelles, pas de cache) ;
 * les tables récentes (support, erreurs) sont lues « en échec ouvert » pour
 * qu'une base pas encore mise à jour n'empêche pas l'outil de s'afficher.
 */
const JOUR = 86_400_000;
/** Activité d'une ÉCOLE : sans les tâches automatiques ni les gestes du pilotage lui-même. */
const HUMAIN_ECOLE = { NOT: [{ userId: "system" }, { userId: { startsWith: "pilotage:" } }] };
const ouvert = <T,>(p: Promise<T>, vide: T) => p.catch((e: Error) => (console.error("[pilotage]", e.message), vide));

export type LigneEcole = {
  id: string;
  nom: string;
  ville: string | null;
  telephone: string | null;
  email: string | null;
  creeLe: Date;
  statut: Statut;
  echeance: Date | null;
  joursRestants: number | null;
  proprietaire: { nom: string; email: string; telephone: string | null } | null;
  classes: number;
  affectations: number;
  eleves: number;
  personnel: number;
  parents: number;
  actifs7j: number;
  derniereActivite: Date | null;
  notes30j: number;
  bulletins: number;
  factures: number;
  ticketsOuverts: number;
  encaisse: number;
  signaux: string[];
  adoption: InfoAdoption;
};

export async function lesEcoles(maintenant = new Date()): Promise<LigneEcole[]> {
  const il7j = new Date(maintenant.getTime() - 7 * JOUR);
  const il30j = new Date(maintenant.getTime() - 30 * JOUR);
  const [ecoles, abos, proprietaires, eleves, comptes, activite, actifs, notes, classes, bulletins, tickets, payes, factures, affectations] = await Promise.all([
    prisma.school.findMany({
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        email: true,
        createdAt: true,
        activeAcademicYear: true,
        stamp: true,
        signature: true,
        logo: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.schoolSubscription.findMany({ select: { schoolId: true, trialEndsAt: true, currentPeriodEnd: true } }),
    prisma.user.findMany({
      where: { role: { in: ["OWNER", "ADMIN"] } },
      select: { schoolId: true, firstName: true, lastName: true, email: true, phone: true, role: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.student.groupBy({ by: ["schoolId"], _count: { _all: true } }),
    prisma.user.groupBy({ by: ["schoolId", "role"], _count: { _all: true } }),
    prisma.auditLog.groupBy({ by: ["schoolId"], where: HUMAIN_ECOLE, _max: { createdAt: true } }),
    prisma.auditLog.groupBy({ by: ["schoolId", "userId"], where: { createdAt: { gte: il7j }, ...HUMAIN_ECOLE } }),
    prisma.grade.groupBy({ by: ["classId"], where: { createdAt: { gte: il30j } }, _count: { _all: true } }),
    prisma.class.findMany({ select: { id: true, schoolId: true } }),
    prisma.reportCard.groupBy({ by: ["schoolId"], _count: { _all: true } }),
    ouvert(prisma.supportTicket.groupBy({ by: ["schoolId"], where: { status: { not: "RESOLU" } }, _count: { _all: true } }), []),
    prisma.subscriptionPayment.groupBy({ by: ["schoolId"], where: { status: "PAYE" }, _sum: { amountXof: true } }),
    ouvert(prisma.invoice.groupBy({ by: ["schoolId"], _count: { _all: true } }), []),
    ouvert(prisma.teachingAssignment.groupBy({ by: ["schoolId"], _count: { _all: true } }), []),
  ]);
  const abo = new Map(abos.map((a) => [a.schoolId, a]));
  const prop = new Map<string, { nom: string; email: string; phone: string | null }>();
  for (const u of proprietaires) {
    if (u.schoolId && (!prop.has(u.schoolId) || u.role === "OWNER")) {
      prop.set(u.schoolId, {
        nom: `${u.firstName} ${u.lastName}`.trim(),
        email: u.email,
        phone: u.phone,
      });
    }
  }
  const nb = <K extends string>(rows: { schoolId: string; _count: { _all: number } }[]) => new Map(rows.map((r) => [r.schoolId, r._count._all])) as Map<K | string, number>;
  const nbEleves = nb(eleves);
  const personnel = new Map<string, number>();
  const parents = new Map<string, number>();
  for (const c of comptes) {
    const m = c.role === "PARENT" ? parents : personnel;
    m.set(c.schoolId, (m.get(c.schoolId) ?? 0) + c._count._all);
  }
  const derniere = new Map(activite.map((a) => [a.schoolId, a._max.createdAt]));
  const nbActifs = new Map<string, number>();
  for (const a of actifs) nbActifs.set(a.schoolId, (nbActifs.get(a.schoolId) ?? 0) + 1);
  const ecoleDeClasse = new Map(classes.map((c) => [c.id, c.schoolId]));
  const nbNotes = new Map<string, number>();
  for (const n of notes) {
    const s = ecoleDeClasse.get(n.classId);
    if (s) nbNotes.set(s, (nbNotes.get(s) ?? 0) + n._count._all);
  }
  const nbBulletins = nb(bulletins);
  const nbTickets = nb(tickets);
  const encaisse = new Map(payes.map((p) => [p.schoolId, p._sum.amountXof ?? 0]));
  const nbClasses = new Map<string, number>();
  for (const c of classes) nbClasses.set(c.schoolId, (nbClasses.get(c.schoolId) ?? 0) + 1);
  const nbFactures = nb(factures);
  const nbAffectations = nb(affectations);

  return ecoles.map((e) => {
    const st = statutEcole(abo.get(e.id) ?? null, maintenant);
    const p = prop.get(e.id);
    const classesCount = nbClasses.get(e.id) ?? 0;
    const affectationsCount = nbAffectations.get(e.id) ?? 0;
    const elevesCount = nbEleves.get(e.id) ?? 0;
    const notesCount = nbNotes.get(e.id) ?? 0;
    const bulletinsCount = nbBulletins.get(e.id) ?? 0;
    const facturesCount = nbFactures.get(e.id) ?? 0;

    const nomContact = p?.nom || `Direction ${e.name}`;
    const emailContact = p?.email || e.email || null;
    const telContact = p?.phone || e.phone || null;
    const contact = {
      nom: nomContact,
      email: emailContact ?? "",
      telephone: telContact,
    };

    const adoption = calculerAdoption({
      nom: e.name,
      classes: classesCount,
      eleves: elevesCount,
      notes30j: notesCount,
      bulletins: bulletinsCount,
      factures: facturesCount,
      proprietaire: contact,
    });
    const ligne = {
      id: e.id,
      nom: e.name,
      ville: e.address,
      telephone: telContact,
      email: emailContact,
      creeLe: e.createdAt,
      ...st,
      proprietaire: contact,
      classes: classesCount,
      affectations: affectationsCount,
      eleves: elevesCount,
      personnel: personnel.get(e.id) ?? 0,
      parents: parents.get(e.id) ?? 0,
      actifs7j: nbActifs.get(e.id) ?? 0,
      derniereActivite: derniere.get(e.id) ?? null,
      notes30j: notesCount,
      bulletins: bulletinsCount,
      factures: facturesCount,
      ticketsOuverts: nbTickets.get(e.id) ?? 0,
      encaisse: encaisse.get(e.id) ?? 0,
      adoption,
    };
    return { ...ligne, signaux: signaux(ligne, maintenant) };
  });
}

import { calculerIntervalle, type IntervallePeriode, type ClePeriode } from "@/lib/periode";

export async function vueEnsemble(
  maintenantOuOptions?: Date | { periode?: string; debut?: string; fin?: string },
  optionsSiDate?: { periode?: string; debut?: string; fin?: string }
) {
  let maintenant = new Date();
  let filtreOptions: { periode?: string; debut?: string; fin?: string } | undefined;

  if (maintenantOuOptions instanceof Date) {
    maintenant = maintenantOuOptions;
    filtreOptions = optionsSiDate;
  } else if (maintenantOuOptions && typeof maintenantOuOptions === "object") {
    filtreOptions = maintenantOuOptions;
  }

  const intervalle: IntervallePeriode = calculerIntervalle(
    filtreOptions?.periode,
    filtreOptions?.debut,
    filtreOptions?.fin,
    maintenant
  );

  const ecoles = await lesEcoles(maintenant);
  const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
  const il6mois = new Date(maintenant.getFullYear(), maintenant.getMonth() - 5, 1);
  const hier = new Date(maintenant.getTime() - JOUR);
  const il7j = new Date(maintenant.getTime() - 7 * JOUR);

  const [
    payesTotal,
    payesPeriode,
    enAttente,
    utilisateurs,
    actifs7j,
    ticketsOuverts,
    ticketsNonLus,
    erreursPeriode,
    erreurs24h,
    notesPeriode,
  ] = await Promise.all([
    prisma.subscriptionPayment.findMany({
      where: { status: "PAYE", paidAt: { gte: il6mois } },
      select: { amountXof: true, paidAt: true, provider: true },
    }),
    prisma.subscriptionPayment.findMany({
      where: { status: "PAYE", paidAt: { gte: intervalle.debut, lte: intervalle.fin } },
      select: { id: true, amountXof: true, paidAt: true, provider: true, schoolId: true },
    }),
    prisma.subscriptionPayment.findMany({
      where: { status: "EN_ATTENTE", createdAt: { lt: hier } },
      select: { id: true, schoolId: true, amountXof: true, createdAt: true, school: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
      take: 20,
    }),
    prisma.user.count({ where: { role: { not: "PARENT" } } }),
    prisma.auditLog.groupBy({ by: ["userId"], where: { createdAt: { gte: il7j }, ...HUMAIN_ECOLE } }),
    ouvert(prisma.supportTicket.count({ where: { status: { not: "RESOLU" } } }), 0),
    ouvert(
      prisma.supportTicket.findMany({
        where: { status: { not: "RESOLU" } },
        select: { id: true, subject: true, kind: true, lastMessageAt: true, staffReadAt: true, schoolId: true },
        orderBy: { lastMessageAt: "asc" },
        take: 50,
      }),
      [],
    ),
    ouvert(prisma.errorEvent.count({ where: { createdAt: { gte: intervalle.debut, lte: intervalle.fin } } }), 0),
    ouvert(prisma.errorEvent.count({ where: { createdAt: { gte: hier } } }), 0),
    prisma.grade.findMany({
      where: { createdAt: { gte: intervalle.debut, lte: intervalle.fin } },
      select: { createdAt: true },
    }),
  ]);

  const compte = compterStatuts(ecoles.map((e) => e.statut));
  const r = revenus(compte);
  const encaisseMois = payesTotal.filter((p) => p.paidAt && p.paidAt >= debutMois).reduce((s, p) => s + p.amountXof, 0);
  const encaissePeriode = payesPeriode.reduce((s, p) => s + p.amountXof, 0);

  // Inscriptions créées sur la période
  const ecolesPeriode = ecoles.filter((e) => e.creeLe >= intervalle.debut && e.creeLe <= intervalle.fin);

  // Génération de séries temporelles pour les graphiques
  const pointsRevenus: { date: string; label: string; valeur: number }[] = [];
  const pointsEcoles: { date: string; label: string; valeur: number }[] = [];
  const pointsNotes: { date: string; label: string; valeur: number }[] = [];

  if (intervalle.granularite === "heure") {
    const debutMs = intervalle.debut.getTime();
    const finMs = intervalle.fin.getTime();
    const pasMs = 2 * 3600 * 1000;
    for (let t = debutMs; t <= finMs; t += pasMs) {
      const d0 = new Date(t);
      const d1 = new Date(Math.min(t + pasMs, finMs));
      const label = `${String(d0.getHours()).padStart(2, "0")}h`;
      const dateStr = d0.toISOString();
      const rev = payesPeriode.filter((p) => p.paidAt && p.paidAt >= d0 && p.paidAt < d1).reduce((s, p) => s + p.amountXof, 0);
      const eco = ecolesPeriode.filter((e) => e.creeLe >= d0 && e.creeLe < d1).length;
      const not = notesPeriode.filter((n) => n.createdAt >= d0 && n.createdAt < d1).length;
      pointsRevenus.push({ date: dateStr, label, valeur: rev });
      pointsEcoles.push({ date: dateStr, label, valeur: eco });
      pointsNotes.push({ date: dateStr, label, valeur: not });
    }
  } else if (intervalle.granularite === "jour") {
    const debutJ = new Date(intervalle.debut.getFullYear(), intervalle.debut.getMonth(), intervalle.debut.getDate());
    const finJ = new Date(intervalle.fin.getFullYear(), intervalle.fin.getMonth(), intervalle.fin.getDate(), 23, 59, 59, 999);
    let cur = new Date(debutJ);
    while (cur <= finJ) {
      const d0 = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate(), 0, 0, 0);
      const d1 = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate(), 23, 59, 59, 999);
      const label = d0.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
      const dateStr = d0.toISOString().slice(0, 10);
      const rev = payesPeriode.filter((p) => p.paidAt && p.paidAt >= d0 && p.paidAt <= d1).reduce((s, p) => s + p.amountXof, 0);
      const eco = ecolesPeriode.filter((e) => e.creeLe >= d0 && e.creeLe <= d1).length;
      const not = notesPeriode.filter((n) => n.createdAt >= d0 && n.createdAt <= d1).length;
      pointsRevenus.push({ date: dateStr, label, valeur: rev });
      pointsEcoles.push({ date: dateStr, label, valeur: eco });
      pointsNotes.push({ date: dateStr, label, valeur: not });
      cur = new Date(cur.getTime() + JOUR);
    }
  } else {
    for (let i = 5; i >= 0; i--) {
      const d0 = new Date(maintenant.getFullYear(), maintenant.getMonth() - i, 1);
      const d1 = new Date(d0.getFullYear(), d0.getMonth() + 1, 1);
      const label = d0.toLocaleDateString("fr-FR", { month: "short" });
      const dateStr = d0.toISOString().slice(0, 7);
      const rev = payesPeriode.filter((p) => p.paidAt && p.paidAt >= d0 && p.paidAt < d1).reduce((s, p) => s + p.amountXof, 0);
      const eco = ecolesPeriode.filter((e) => e.creeLe >= d0 && e.creeLe < d1).length;
      const not = notesPeriode.filter((n) => n.createdAt >= d0 && n.createdAt < d1).length;
      pointsRevenus.push({ date: dateStr, label, valeur: rev });
      pointsEcoles.push({ date: dateStr, label, valeur: eco });
      pointsNotes.push({ date: dateStr, label, valeur: not });
    }
  }

  // Barres historiques (6 derniers mois)
  const parMois: { mois: string; montant: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(maintenant.getFullYear(), maintenant.getMonth() - i, 1);
    const f = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    parMois.push({
      mois: d.toLocaleDateString("fr-FR", { month: "short" }),
      montant: payesTotal.filter((p) => p.paidAt && p.paidAt >= d && p.paidAt < f).reduce((s, p) => s + p.amountXof, 0),
    });
  }

  const nouvellesParSemaine: { semaine: string; n: number }[] = [];
  for (let i = 7; i >= 0; i--) {
    const fin = new Date(maintenant.getTime() - i * 7 * JOUR);
    const debut = new Date(fin.getTime() - 7 * JOUR);
    nouvellesParSemaine.push({
      semaine: debut.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
      n: ecoles.filter((e) => e.creeLe >= debut && e.creeLe < fin).length,
    });
  }

  // Répartition par moyen de paiement sur la période
  const repartitionMoyens = {
    wave: {
      montant: payesPeriode.filter((p) => p.provider === "WAVE").reduce((s, p) => s + p.amountXof, 0),
      nombre: payesPeriode.filter((p) => p.provider === "WAVE").length,
    },
    orangeMoney: {
      montant: payesPeriode.filter((p) => p.provider === "ORANGE_MONEY").reduce((s, p) => s + p.amountXof, 0),
      nombre: payesPeriode.filter((p) => p.provider === "ORANGE_MONEY").length,
    },
    manuel: {
      montant: payesPeriode.filter((p) => p.provider === "MANUEL").reduce((s, p) => s + p.amountXof, 0),
      nombre: payesPeriode.filter((p) => p.provider === "MANUEL").length,
    },
  };

  const nomEcole = new Map(ecoles.map((e) => [e.id, e.nom]));
  const nonLus = ticketsNonLus.filter((t) => !t.staffReadAt || t.staffReadAt < t.lastMessageAt);
  const actives = ecoles.filter((e) => e.statut === "PAYANTE" || e.statut === "ESSAI" || e.statut === "EN_RETARD");
  const funnel = calculerFunnelLancement(ecoles);
  const champions = ecoles.filter((e) => e.adoption.estChampionne).sort((a, b) => b.eleves - a.eleves);
  const bloquees = ecoles
    .filter((e) => e.adoption.score < 5)
    .sort((a, b) => b.eleves - a.eleves || b.classes - a.classes);

  // Tâches prioritaires et déblocages métiers
  const ecolesSansProf = ecoles.filter((e) => e.classes > 0 && e.affectations === 0);
  const ecolesFinEssai = ecoles.filter((e) => e.statut === "ESSAI" && e.joursRestants !== null && e.joursRestants <= 3);
  const ecolesSilencieuses = ecoles.filter(
    (e) => (e.statut === "PAYANTE" || e.statut === "ESSAI") && (!e.derniereActivite || maintenant.getTime() - e.derniereActivite.getTime() > 7 * JOUR)
  );

  return {
    ecoles,
    compte,
    revenus: r,
    encaisseMois,
    encaissePeriode,
    inscriptionsPeriode: ecolesPeriode.length,
    notesPeriode: notesPeriode.length,
    erreursPeriode,
    intervalle,
    repartitionMoyens,
    seriesTemporelle: {
      revenus: pointsRevenus,
      ecoles: pointsEcoles,
      notes: pointsNotes,
    },
    tachesPrioritaires: {
      orphelines: ecolesSansProf,
      finEssai: ecolesFinEssai,
      silencieuses: ecolesSilencieuses,
    },
    parMois,
    nouvellesParSemaine,
    utilisateurs,
    actifs7j: actifs7j.length,
    ticketsOuverts,
    ticketsNonLus: nonLus.map((t) => ({ ...t, ecole: nomEcole.get(t.schoolId) ?? "?" })),
    paiementsEnAttente: enAttente,
    erreurs24h,
    aSurveiller: ecoles.filter((e) => e.signaux.length).sort((a, b) => b.signaux.length - a.signaux.length),
    activation: {
      total: actives.length,
      eleves: actives.filter((e) => e.eleves > 0).length,
      notes: actives.filter((e) => e.notes30j > 0).length,
      bulletins: actives.filter((e) => e.bulletins > 0).length,
    },
    funnel,
    champions,
    bloquees,
    prix: PRO_PRICE_XOF,
  };
}

export async function ficheEcole(id: string, maintenant = new Date()) {
  const ecole = await prisma.school.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      address: true,
      phone: true,
      email: true,
      createdAt: true,
      onboardingCompleted: true,
      activeAcademicYear: true,
      logo: true,
      stamp: true,
      signature: true,
      logoSize: true,
      stampSize: true,
      signatureSize: true,
      primaryColor: true,
      inspectionAcademique: true,
      inspectionIEF: true,
      regionAcademique: true,
      waveNumber: true,
      orangeMoneyNumber: true,
      cashDeskHours: true,
      invoiceLateConsequence: true,
      setupProgress: true,
    },
  });
  if (!ecole) return null;
  const [ligne] = (await lesEcoles(maintenant)).filter((e) => e.id === id);
  const [
    abo,
    paiements,
    membres,
    journal,
    classesList,
    tickets,
    facturesCount,
    facturesAgg,
    paiementsCount,
    paiementsAgg,
    subjectsCount,
    assignmentsList,
    terms,
    studentsCount,
    studentsWithoutClass,
    studentsWithPhone,
    evaluationsCount,
    bulletinsCount,
    erreursRecentes,
  ] = await Promise.all([
    prisma.schoolSubscription.findUnique({ where: { schoolId: id } }),
    prisma.subscriptionPayment.findMany({ where: { schoolId: id }, orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.user.findMany({
      where: { schoolId: id, role: { not: "PARENT" } },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true, role: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.auditLog.findMany({ where: { schoolId: id }, orderBy: { createdAt: "desc" }, take: 40, select: { id: true, action: true, entity: true, userId: true, createdAt: true, details: true } }),
    prisma.class.findMany({
      where: { schoolId: id },
      select: {
        id: true,
        name: true,
        cycle: true,
        teacherId: true,
        _count: { select: { enrollments: true, assignments: true, grades: true } },
      },
      orderBy: { name: "asc" },
    }),
    ouvert(prisma.supportTicket.findMany({ where: { schoolId: id }, orderBy: { lastMessageAt: "desc" }, take: 20 }), []),
    ouvert(prisma.invoice.count({ where: { schoolId: id } }), 0),
    ouvert(prisma.invoice.aggregate({ where: { schoolId: id }, _sum: { totalAmount: true } }), { _sum: { totalAmount: 0 } }),
    ouvert(prisma.payment.count({ where: { schoolId: id } }), 0),
    ouvert(prisma.payment.aggregate({ where: { schoolId: id }, _sum: { amount: true } }), { _sum: { amount: 0 } }),
    ouvert(prisma.subject.count({ where: { schoolId: id } }), 0),
    ouvert(prisma.teachingAssignment.findMany({ where: { schoolId: id }, select: { teacherId: true, classId: true } }), []),
    ouvert(prisma.term.findMany({ where: { schoolId: id }, select: { id: true, name: true, startDate: true, endDate: true }, orderBy: { startDate: "asc" } }), []),
    ouvert(prisma.student.count({ where: { schoolId: id } }), 0),
    ouvert(prisma.student.count({ where: { schoolId: id, enrollments: { none: {} } } }), 0),
    ouvert(prisma.student.count({ where: { schoolId: id, emergencyPhone: { not: null } } }), 0),
    ouvert(prisma.evaluation.count({ where: { schoolId: id } }), 0),
    ouvert(prisma.reportCard.count({ where: { schoolId: id } }), 0),
    ouvert(prisma.errorEvent.findMany({ where: { path: { contains: id } }, orderBy: { createdAt: "desc" }, take: 10 }), []),
  ]);
  const derniere = await prisma.auditLog.groupBy({ by: ["userId"], where: { schoolId: id }, _max: { createdAt: true } });
  const vuLe = new Map(derniere.map((d) => [d.userId, d._max.createdAt]));
  const noms = new Map(membres.map((m) => [m.id, `${m.firstName} ${m.lastName}`.trim()]));

  const profsAssignesUniques = new Set(assignmentsList.map((a) => a.teacherId)).size;
  const classesAvecProf = new Set(assignmentsList.map((a) => a.classId));
  const classesSansProfCount = classesList.filter((c) => !classesAvecProf.has(c.id)).length;

  const invTotal = facturesAgg?._sum?.totalAmount ?? 0;
  const payTotal = paiementsAgg?._sum?.amount ?? 0;

  const auditMetiers = evaluerMetiersEcole({
    nom: ecole.name,
    nomDirecteur: ligne?.proprietaire?.nom || "Directeur",
    aLogo: Boolean(ecole.logo),
    aStamp: Boolean(ecole.stamp),
    aSignature: Boolean(ecole.signature),
    anneeScolaire: ecole.activeAcademicYear,
    periodesCount: terms.length,
    adminCount: membres.filter((m) => m.role === "OWNER" || m.role === "ADMIN").length,
    classesCount: classesList.length,
    subjectsCount,
    assignmentsCount: assignmentsList.length,
    profsAssignesCount: profsAssignesUniques,
    classesSansProfCount,
    notes30j: ligne?.notes30j ?? 0,
    bulletinsCount,
    studentsCount,
    studentsWithoutClassCount: studentsWithoutClass,
    studentsWithPhoneCount: studentsWithPhone,
    invoicesCount: facturesCount,
    invoicesTotal: invTotal,
    paymentsCount: paiementsCount,
    paymentsTotal: payTotal,
    aWave: Boolean(ecole.waveNumber),
    aOrangeMoney: Boolean(ecole.orangeMoneyNumber),
  });

  return {
    ecole,
    ligne,
    abo,
    paiements,
    classes: classesList.length,
    classesList,
    subjectsCount,
    assignmentsCount: assignmentsList.length,
    profsAssignesUniques,
    classesSansProfCount,
    terms,
    studentsCount,
    studentsWithoutClass,
    studentsWithPhone,
    invoicesCount: facturesCount,
    invoicesTotal: invTotal,
    paymentsCount: paiementsCount,
    paymentsTotal: payTotal,
    evaluationsCount,
    bulletinsCount,
    auditMetiers,
    facturesCount,
    erreursRecentes,
    membres: membres.map((m) => ({ ...m, derniereActivite: vuLe.get(m.id) ?? null })),
    journal: journal.map((j) => ({ ...j, auteur: j.userId === "system" ? "Automatique" : j.userId.startsWith("pilotage:") ? "Équipe EduCom" : (noms.get(j.userId) ?? "Compte supprimé") })),
    tickets,
  };
}

export async function lesErreurs() {
  const depuis = new Date(Date.now() - 14 * JOUR);
  const rows = await ouvert(prisma.errorEvent.findMany({ where: { createdAt: { gte: depuis } }, orderBy: { createdAt: "desc" }, take: 500 }), []);
  const groupes = new Map<string, { message: string; path: string; routeType: string | null; n: number; derniere: Date; premiere: Date; digest: string | null }>();
  for (const r of rows) {
    const cle = `${r.path.split("?")[0]}|${r.message.slice(0, 160)}`;
    const g = groupes.get(cle);
    if (g) {
      g.n++;
      if (r.createdAt < g.premiere) g.premiere = r.createdAt;
    } else groupes.set(cle, { message: r.message, path: r.path.split("?")[0], routeType: r.routeType, n: 1, derniere: r.createdAt, premiere: r.createdAt, digest: r.digest });
  }
  return [...groupes.values()].sort((a, b) => b.derniere.getTime() - a.derniere.getTime());
}

export async function journalPilotage() {
  const rows = await prisma.auditLog.findMany({ where: { entity: { in: ["pilotage", "support"] } }, orderBy: { createdAt: "desc" }, take: 100 });
  const ecoles = new Map((await prisma.school.findMany({ where: { id: { in: [...new Set(rows.map((r) => r.schoolId))] } }, select: { id: true, name: true } })).map((s) => [s.id, s.name]));
  return rows.map((r) => ({ ...r, ecole: ecoles.get(r.schoolId) ?? "—" }));
}

/** Pastilles du rail : demandes non lues, erreurs des dernières 24 h. */
export async function badgesPilotage() {
  const hier = new Date(Date.now() - JOUR);
  const [support, erreurs] = await Promise.all([
    ouvert(
      prisma.supportTicket
        .findMany({ where: { status: { not: "RESOLU" } }, select: { lastMessageAt: true, staffReadAt: true } })
        .then((t) => t.filter((x) => !x.staffReadAt || x.staffReadAt < x.lastMessageAt).length),
      0,
    ),
    ouvert(prisma.errorEvent.count({ where: { createdAt: { gte: hier } } }), 0),
  ]);
  return { support, erreurs };
}
