import type { ActorContext } from "@/lib/audit";
import {
  perimetre,
  peutModerer,
  chargerFil,
  barreLaterale,
  marquerEspaceVu,
  infoEspace,
  personnesInvitables,
  lireEspace,
  mentionnables,
} from "@/lib/community";
import { tableauEngagement } from "@/lib/engagement";
import { tableauResultats } from "@/lib/resultats";
import { iaConfiguree } from "@/lib/ia";
import { annoncerSondagesEchus } from "@/lib/sondages";
import { publierProgrammesEchus } from "@/lib/programmes";
import { listerFormulaires, chargerFormulaire, nombreFormulairesARemplir, peutCreerFormulaire } from "@/lib/formulaires";
import { listerConversations, chargerMessages, elevesJoignables, conversationVisible, canalDuRole, CANAUX, collegues } from "@/lib/messagerie";

/**
 * Données de la page Communauté (personnel et familles) — refonte façon Slack
 * du 26 sept. 2026 : canaux, classes et messages directs sur une seule page.
 */
export type VueFormulairesDonnees =
  | { type: "liste"; liste: Awaited<ReturnType<typeof listerFormulaires>>; peutCreer: boolean }
  | { type: "nouveau" }
  | { type: "detail"; form: NonNullable<Awaited<ReturnType<typeof chargerFormulaire>>> };

export async function chargerCommunaute(actor: ActorContext, params: { espace?: string; c?: string; form?: string }) {
  const famille = actor.role === "PARENT";
  const p = await perimetre(actor);
  // Sondages arrivés à échéance : résultats annoncés sans attendre la tâche quotidienne (idempotent).
  await annoncerSondagesEchus(actor.schoolId).catch(() => 0);
  await publierProgrammesEchus(actor.schoolId).catch(() => 0);
  const visible = params.c ? await conversationVisible(actor, p, params.c) : null;
  // Formulaires (26 sept.) : `?espace=FORMULAIRES` (liste), `?form=nouveau`, `?form=<id>`.
  let formulaires: VueFormulairesDonnees | null = null;
  if (!visible && (params.form || params.espace === "FORMULAIRES")) {
    if (params.form === "nouveau" && peutCreerFormulaire(actor.role, p.grants)) formulaires = { type: "nouveau" };
    else if (params.form && params.form !== "nouveau") {
      const form = await chargerFormulaire(actor, params.form);
      if (form) formulaires = { type: "detail", form };
    }
    formulaires ??= { type: "liste", liste: await listerFormulaires(actor), peutCreer: peutCreerFormulaire(actor.role, p.grants) };
  }
  const sondages = !visible && params.espace === "SONDAGES";
  const engagement = !visible && !formulaires && params.espace === "ENGAGEMENT" ? await tableauEngagement(actor) : null;
  const resultats = !visible && !formulaires && params.espace === "RESULTATS" && !famille ? await tableauResultats(actor, p) : null;
  const e = lireEspace(sondages || resultats ? "" : params.espace);
  // Anciens liens (`?espace=<classId>`) : normalisés en « classe:<id> ».
  const espace = visible || sondages || resultats ? "" : e.type === "TOUT" ? "" : e.type === "ECOLE" ? "ECOLE" : `${e.type === "CLASSE" ? "classe" : "canal"}:${e.id}`;

  const [barre, publications, info, conversations, messages, eleves, invitables, equipe, personnes] = await Promise.all([
    barreLaterale(actor, p),
    visible || formulaires || engagement || resultats ? Promise.resolve([]) : chargerFil(actor, p, { espace, limite: 40, sondagesSeulement: sondages }),
    visible || formulaires || !espace ? Promise.resolve(null) : infoEspace(actor, p, espace),
    listerConversations(actor, p),
    visible ? chargerMessages(actor, visible.id) : Promise.resolve([]),
    elevesJoignables(actor, p),
    famille ? Promise.resolve([]) : personnesInvitables(actor),
    collegues(actor),
    mentionnables(actor),
  ]);
  const formsARemplir = await nombreFormulairesARemplir(actor);
  // Fil d'actualité ouvert : tout ce qu'il montre compte comme « vu » (tableau d'engagement).
  if (!espace && !visible && !formulaires && !engagement && !sondages && !resultats) await marquerEspaceVu(actor, "FIL");
  let luJusqua: string | null = null;
  if (espace && !formulaires) {
    luJusqua = (await marquerEspaceVu(actor, espace))?.toISOString() ?? null;
    // La pastille de l'espace ouvert disparaît dès l'affichage.
    for (const x of [barre.general, ...barre.canaux, ...barre.classes]) if (x.cle === espace) x.nonLus = 0;
  }
  const resume = visible ? conversations.find((x) => x.id === visible.id) : null;
  if (resume) resume.nonLus = 0;

  return {
    famille,
    role: actor.role,
    // « SONDAGES » : vue de tous les sondages visibles (entrée « Sondages » de la barre).
    espace: formulaires ? "FORMULAIRES" : engagement ? "ENGAGEMENT" : resultats ? "RESULTATS" : sondages ? "SONDAGES" : espace,
    engagement,
    resultats,
    /** Lecture précédente de l'espace ouvert (ligne « Nouveaux messages »). */
    luJusqua,
    formulaires,
    formsARemplir,
    barre,
    publications,
    info,
    conversations,
    discussion: resume ? { id: resume.id, titre: resume.titre, sousTitre: resume.sousTitre, messages, avatar: resume.avatar } : null,
    eleves,
    collegues: equipe,
    services: famille ? CANAUX.map((x) => ({ id: x.id, label: x.label })) : [],
    peutEcrireFamilles: !famille && canalDuRole(actor.role) !== null,
    moderateur: peutModerer(actor.role, p.grants),
    // IA : visible seulement si une clé est configurée (clé annulée le 26 sept. → tout est masqué).
    ia: !famille && iaConfiguree(),
    invitables,
    personnes,
  };
}
