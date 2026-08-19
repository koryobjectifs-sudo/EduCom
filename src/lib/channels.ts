/**
 * Canaux de diffusion — ce qui peut RÉELLEMENT quitter EduCom. Lot 17.
 *
 * ═══ CE FICHIER EST LA SEULE AUTORITÉ SUR LA QUESTION ═══
 *
 * Un écran ne décide jamais seul s'il peut écrire « envoyé ». Il demande ici.
 * Sans ce point unique, chaque module réinventerait sa propre réponse, et il
 * suffirait qu'un seul se trompe pour qu'une directrice croie trois cents
 * familles prévenues alors que personne ne l'est.
 *
 * ═══ TROIS ÉTATS, ET UN SEUL AUTORISE LE MOT « ENVOYÉ » ═══
 *
 *   ABSENT               rien n'est configuré, rien n'est branché.
 *   CONFIGURE_NON_PROUVE des identifiants existent — et ne prouvent RIEN.
 *   OPERATIONNEL         un envoi a une implémentation réelle ET la
 *                        configuration est complète.
 *
 * ⚠️ **`CONFIGURE_NON_PROUVE` n'est pas un demi-succès, c'est un refus.** La
 * présence d'une clé d'API dans `.env` ne dit pas que le compte est actif, qu'il
 * détient un expéditeur, qu'il n'est pas en essai, ni que le fournisseur
 * accepterait la requête. Le dépôt en porte la preuve : les identifiants Twilio
 * sont présents et valides depuis des semaines, le compte ne détient **aucun
 * numéro** et n'a **jamais émis un seul message** — pendant que la table
 * `Message` en comptait six marqués `SENT`.
 *
 * ═══ POURQUOI `canSend` NE PEUT PAS ÊTRE VRAI AUJOURD'HUI ═══
 *
 * Un canal ne devient `OPERATIONNEL` que si son identifiant figure dans
 * `SEND_IMPLEMENTATIONS` ci-dessous — c'est-à-dire si **du code envoie
 * réellement**. Ce registre est vide, et c'est délibéré : aucune fonction
 * d'envoi de document n'existe dans ce dépôt. Le jour où l'une est écrite et
 * prouvée, elle s'inscrit ICI, en un seul endroit, jamais dans un écran.
 *
 * ⚠️ **Ce module n'importe pas Prisma** (leçon du lot 13.1) — mais il lit
 * `process.env`, donc il reste serveur. Un composant `"use client"` ne doit pas
 * l'importer : la page lui passe les capacités en props, ce sont des données
 * sérialisables.
 */

export type ChannelId = "whatsapp" | "email" | "sms" | "drive";

export type ChannelState = "ABSENT" | "CONFIGURE_NON_PROUVE" | "OPERATIONNEL";

export type Channel = {
  id: ChannelId;
  label: string;
  state: ChannelState;
  /** Le produit a-t-il le droit d'annoncer un envoi ? Vrai UNIQUEMENT si `OPERATIONNEL`. */
  canSend: boolean;
  /**
   * La préparation est-elle utile sur ce canal ? Un texte et un lien se collent
   * dans WhatsApp ou dans une messagerie ; ils ne se collent pas dans Drive.
   */
  canPrepare: boolean;
  /** Ce que l'écran affiche à l'utilisateur. Toujours une raison, jamais un statut nu. */
  reason: string;
  /** Ce qui manque, nommé — pour que la dépendance soit actionnable. */
  missing: string[];
};

/**
 * Canaux pour lesquels une fonction d'envoi réelle existe dans ce dépôt.
 *
 * ⚠️ **VIDE, ET CE N'EST PAS UN OUBLI.** Ajouter une entrée ici sans avoir écrit
 * ET prouvé l'envoi correspondant ferait mentir tout le produit d'un coup :
 * c'est la seule ligne qui autorise le mot « envoyé ».
 */
const SEND_IMPLEMENTATIONS: Partial<Record<ChannelId, true>> = {};

const LABELS: Record<ChannelId, string> = {
  whatsapp: "WhatsApp",
  email: "E-mail",
  sms: "SMS",
  drive: "Google Drive",
};

function env(name: string): string | null {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : null;
}

/** Vrai si l'expéditeur Twilio configuré est un expéditeur **WhatsApp**, pas un numéro SMS. */
function twilioSenderIsWhatsApp(): boolean {
  return (env("TWILIO_PHONE_NUMBER") ?? "").startsWith("whatsapp:");
}

function twilioMissing(): string[] {
  return (["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_PHONE_NUMBER"] as const)
    .filter((k) => !env(k));
}

/**
 * Construit l'état d'un canal.
 *
 * ⚠️ L'ordre des questions compte : on regarde d'abord ce qui MANQUE, puis on
 * n'accorde `OPERATIONNEL` que si un envoi existe vraiment. Inverser reviendrait
 * à promouvoir un canal parce que sa configuration est jolie.
 */
function build(id: ChannelId, missing: string[], reasons: { absent: string; unproven: string; ready: string }, canPrepare: boolean): Channel {
  if (missing.length > 0) {
    return { id, label: LABELS[id], state: "ABSENT", canSend: false, canPrepare, reason: reasons.absent, missing };
  }
  if (!SEND_IMPLEMENTATIONS[id]) {
    return { id, label: LABELS[id], state: "CONFIGURE_NON_PROUVE", canSend: false, canPrepare, reason: reasons.unproven, missing: [] };
  }
  return { id, label: LABELS[id], state: "OPERATIONNEL", canSend: true, canPrepare, reason: reasons.ready, missing: [] };
}

/** État réel de tous les canaux, tel qu'il est à cet instant. */
export function channels(): Channel[] {
  const twMissing = twilioMissing();

  const whatsapp = build(
    "whatsapp",
    // ⚠️ Un numéro Twilio ordinaire n'est PAS un expéditeur WhatsApp. Accepter
    // `+1737…` comme canal WhatsApp ferait échouer chaque envoi à la première
    // tentative, après avoir annoncé le contraire à l'écran.
    twMissing.length > 0 ? twMissing : (twilioSenderIsWhatsApp() ? [] : ["expéditeur WhatsApp approuvé (TWILIO_PHONE_NUMBER doit commencer par « whatsapp: »)"]),
    {
      absent: "Aucun expéditeur WhatsApp n'est branché sur EduCom.",
      unproven: "Un expéditeur WhatsApp est configuré, mais aucun envoi de document n'est implémenté : EduCom ne peut rien transmettre.",
      ready: "Envoi WhatsApp disponible.",
    },
    true,
  );

  const email = build(
    "email",
    // Aucune variable d'expédition de courriel n'est lue par ce dépôt, et aucun
    // client SMTP/API n'y est installé. La liste dit ce qu'il faudrait, elle
    // n'invente pas un fournisseur.
    ["un service d'envoi de courriel (aucun n'est installé ni configuré)"],
    {
      absent: "Aucun service d'e-mail n'est connecté à EduCom.",
      unproven: "Un service d'e-mail est configuré, mais aucun envoi n'est implémenté.",
      ready: "Envoi d'e-mail disponible.",
    },
    true,
  );

  const sms = build(
    "sms",
    twMissing,
    {
      absent: "Aucun expéditeur SMS n'est configuré.",
      unproven:
        "Des identifiants Twilio sont présents, mais rien ne prouve qu'un message puisse partir " +
        "(compte, expéditeur détenu, quota). Aucun envoi de document n'est implémenté.",
      ready: "Envoi SMS disponible.",
    },
    false,
  );

  const drive = build(
    "drive",
    ["un compte Google connecté (aucun SDK ni identifiant dans ce dépôt)"],
    {
      absent: "Google Drive n'est pas connecté à EduCom.",
      unproven: "Un compte Google est configuré, mais aucun dépôt de fichier n'est implémenté.",
      ready: "Dépôt Google Drive disponible.",
    },
    false,
  );

  return [whatsapp, email, sms, drive];
}

export function channel(id: ChannelId): Channel {
  return channels().find((c) => c.id === id)!;
}

/** Canaux proposés à la diffusion d'un document. Les autres n'ont pas de sens ici. */
export const DIFFUSION_CHANNELS: ChannelId[] = ["whatsapp", "email"];

/**
 * Vrai si le produit a le droit d'écrire « envoyé » pour ce canal.
 *
 * ⚠️ Le seul appelant légitime d'une future fonction d'envoi. Contourner cette
 * question, c'est reproduire le défaut que le lot 17 est venu corriger.
 */
export function canSend(id: ChannelId): boolean {
  return channel(id).canSend;
}

/** Vrai si AUCUN canal ne peut envoyer. L'écran s'en sert pour ne rien promettre. */
export function noRealSendChannel(): boolean {
  return channels().every((c) => !c.canSend);
}

/* ═══════════════════ adresses réellement utilisables ═══════════════════ */

/**
 * Normalise un téléphone au format international.
 *
 * Renvoie `null` si le numéro ne peut pas être rendu appelable — et c'est le
 * point important : un numéro à six chiffres n'est pas « presque bon », il est
 * inutilisable, et le dire évite de compter une famille comme joignable.
 *
 * Le Sénégal (+221) est la valeur par défaut d'un numéro national à neuf
 * chiffres : c'est le pays de tous les établissements servis. Un numéro déjà
 * préfixé `+` est respecté tel quel.
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[\s().-]/g, "");
  if (/^\+[1-9]\d{7,14}$/.test(cleaned)) return cleaned;
  if (/^00[1-9]\d{7,14}$/.test(cleaned)) return `+${cleaned.slice(2)}`;
  if (/^221\d{9}$/.test(cleaned)) return `+${cleaned}`;
  if (/^\d{9}$/.test(cleaned)) return `+221${cleaned}`;
  return null;
}

/**
 * Renvoie l'e-mail s'il a une forme exploitable, `null` sinon.
 *
 * ⚠️ Une forme valide ne prouve pas qu'une boîte existe — aucune vérification
 * de délivrabilité n'est possible ici. C'est pourquoi le produit ne dit jamais
 * « joignable » mais « adresse disponible » : la nuance est ce qui empêche de
 * confondre une adresse avec une personne prévenue.
 */
export function usableEmail(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase();
  return /^[^@\s]+@[^@\s.]+\.[^@\s]{2,}$/.test(v) ? v : null;
}
