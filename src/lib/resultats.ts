import { prisma } from "@/lib/prisma";
import type { ActorContext } from "@/lib/audit";
import { roleLabel } from "@/lib/permissions";
import { chargerFil, type Perimetre } from "@/lib/community";
import { destinatairesPublication } from "@/lib/engagement";
import { lireFormulaire, lireSondage, type Ton } from "@/lib/interpretation";
import { peutCreerFormulaire, type Question } from "@/lib/formulaires";

/**
 * Espace « Résultats » — 26 sept. 2026. Toutes les enquêtes (formulaires et
 * sondages) avec leur lecture automatique (`lib/interpretation.ts`).
 *
 * ═══ RÈGLES ═══
 * Personnel seulement (jamais les parents).
 * Formulaires : ceux dont je suis l'auteur ; la direction voit tous ceux de l'école.
 * Sondages : ceux des publications que je vois déjà (mêmes droits que le fil).
 */
const DIRECTION = ["OWNER", "ADMIN"];
const nom = (u?: { firstName: string | null; lastName: string | null } | null) =>
  u ? [u.firstName, u.lastName].filter(Boolean).join(" ") || "—" : "—";

export type CarteFormulaire = {
  type: "formulaire";
  id: string;
  titre: string;
  auteur: string;
  date: string;
  clos: boolean;
  repondants: number;
  destinataires: number;
  taux: number;
  indice: number | null;
  constats: { ton: Ton; titre: string; texte: string }[];
};

export type CarteSondageResultat = {
  type: "sondage";
  id: string;
  postId: string;
  espace: string;
  espaceNom: string;
  question: string;
  auteur: string;
  date: string;
  clos: boolean;
  multiple: boolean;
  anonyme: boolean;
  votants: number;
  destinataires: number | null;
  taux: number;
  options: { label: string; votes: number; noms: string[] | null }[];
  phrase: string;
  verdict: string;
  peutRelancer: boolean;
};

export type TableauResultats = {
  cartes: (CarteFormulaire | CarteSondageResultat)[];
  totaux: { enquetes: number; reponses: number; tauxMoyen: number | null; enCours: number };
  peutCreer: boolean;
};

export async function tableauResultats(actor: ActorContext, p: Perimetre): Promise<TableauResultats | null> {
  if (actor.role === "PARENT") return null;
  const direction = DIRECTION.includes(actor.role);
  const maintenant = new Date();

  const [forms, pubs] = await Promise.all([
    prisma.communityForm.findMany({
      where: { schoolId: actor.schoolId, ...(direction ? {} : { authorId: actor.userId }) },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        title: true,
        authorId: true,
        createdAt: true,
        closesAt: true,
        anonymous: true,
        questions: true,
        _count: { select: { recipients: true } },
        responses: { select: { userId: true, answers: true, updatedAt: true } },
      },
    }),
    chargerFil(actor, p, { limite: 30, sondagesSeulement: true }),
  ]);

  const ids = [...new Set([...forms.map((f) => f.authorId), ...forms.flatMap((f) => (f.anonymous ? [] : f.responses.map((r) => r.userId)))])];
  const users = new Map(
    (await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, firstName: true, lastName: true, role: true } })).map((u) => [u.id, u]),
  );

  const cartesForms: CarteFormulaire[] = forms.map((f) => {
    const l = lireFormulaire(
      f.questions as Question[],
      f.responses.map((r) => ({
        answers: r.answers as Record<string, string | string[]>,
        profil: f.anonymous ? null : roleLabel(users.get(r.userId)?.role ?? ""),
        date: r.updatedAt.toISOString(),
      })),
      f._count.recipients,
      f.createdAt.toISOString(),
    );
    return {
      type: "formulaire",
      id: f.id,
      titre: f.title,
      auteur: nom(users.get(f.authorId)),
      date: f.createdAt.toISOString(),
      clos: Boolean(f.closesAt && f.closesAt <= maintenant),
      repondants: f.responses.length,
      destinataires: f._count.recipients,
      taux: l.participation.taux,
      indice: l.indice,
      // La participation est déjà affichée par l'anneau : on garde les constats suivants.
      constats: l.aRetenir.filter((c) => c.icone !== "participation" && c.icone !== "rythme").slice(0, 2),
    };
  });

  // Destinataires des sondages : même calcul que « Qui a vu ? ».
  const postsInfo = await prisma.communityPost.findMany({
    where: { id: { in: pubs.filter((x) => x.sondage).map((x) => x.id) }, schoolId: actor.schoolId },
    select: { id: true, schoolId: true, authorId: true, audience: true, classId: true, channelId: true, createdAt: true },
  });
  const infos = new Map(postsInfo.map((x) => [x.id, x]));
  const cartesSondages: CarteSondageResultat[] = [];
  for (const pub of pubs) {
    const s = pub.sondage;
    const info = infos.get(pub.id);
    if (!s || !info) continue;
    const destinataires = (await destinatairesPublication(info).catch(() => [])).length || null;
    const l = lireSondage(s, destinataires);
    cartesSondages.push({
      type: "sondage",
      id: s.id,
      postId: pub.id,
      espace: pub.espace,
      espaceNom: pub.espaceNom,
      question: s.question,
      auteur: pub.auteur,
      date: pub.createdAt,
      clos: s.clos,
      multiple: s.multiple,
      anonyme: s.anonyme,
      votants: s.votants,
      destinataires,
      taux: l.participation.taux,
      options: s.options.map((o) => ({ label: o.label, votes: o.votes, noms: o.noms })),
      phrase: l.choix.phrase,
      verdict: l.choix.verdict,
      // Même règle que « Clore » : l'auteur ou la direction.
      peutRelancer: !s.clos && (s.peutClore || info.authorId === actor.userId),
    });
  }

  const cartes = [...cartesForms, ...cartesSondages].sort((a, b) => b.date.localeCompare(a.date));
  const avecTaux = cartes.filter((c) => Boolean(c.destinataires));
  return {
    cartes,
    totaux: {
      enquetes: cartes.length,
      reponses: cartes.reduce((t, c) => t + (c.type === "formulaire" ? c.repondants : c.votants), 0),
      tauxMoyen: avecTaux.length ? Math.round(avecTaux.reduce((t, c) => t + c.taux, 0) / avecTaux.length) : null,
      enCours: cartes.filter((c) => !c.clos).length,
    },
    peutCreer: peutCreerFormulaire(actor.role),
  };
}
