import { prisma } from "@/lib/prisma";
import type { ActorContext } from "@/lib/audit";
import { studentWhereFor } from "@/lib/studentScope";
import { studentFile } from "@/lib/studentFile";
import type { DocCategory } from "../generated/prisma/client";

/**
 * Propositions de classement — lot 14.
 *
 * ═══ IL N'Y A AUCUN OCR DANS CE PROJET, ET CE FICHIER NE FAIT PAS SEMBLANT ═══
 *
 * Inventaire réel, fait avant d'écrire une ligne : aucune dépendance de
 * reconnaissance de texte dans `package.json` ; aucun secret de fournisseur dans
 * `.env` (Supabase et Twilio, rien d'autre) ; aucun appel à un service de vision
 * dans le dépôt. **Aucune infrastructure OCR sécurisée n'existe.**
 *
 * Le cahier des charges du lot 14 est explicite : ne pas inventer un
 * fournisseur, ne pas fabriquer de faux résultats. Ce module implémente donc le
 * *siège* de l'analyse — `ocrCapability()` et `analyzeDocument()` — de façon
 * qu'une intégration future s'y branche sans rien réécrire, et il annonce
 * franchement que la reconnaissance de texte n'est pas disponible.
 *
 * ═══ CE QUI EST RÉELLEMENT ANALYSÉ AUJOURD'HUI ═══
 *
 * Le seul texte réellement disponible sans OCR est le **nom du fichier**. Ce
 * n'est pas rien : une secrétaire qui numérise nomme ses fichiers
 * (« Diallo Mamadou extrait de naissance.pdf »). Ce texte est comparé :
 *
 *   · aux libellés de la **checklist de l'établissement** (jamais à une liste
 *     nationale codée en dur — le lot 13 a posé que chaque école déclare ses
 *     propres pièces) ;
 *   · aux noms des élèves **du périmètre de l'appelant**.
 *
 * ⚠️ Le pourcentage affiché est la sortie de **Jaro-Winkler**, un algorithme
 * réel, calculé sur ces deux chaînes. Ce n'est pas un score de confiance
 * inventé. Quand le nom du fichier ne porte aucun signal — `IMG_4821.jpg`, cas
 * courant d'une capture appareil photo — il n'y a **aucune proposition**, et
 * l'écran dit « correspondance incertaine » plutôt que d'afficher un chiffre.
 *
 * ⚠️ **Le binaire ne quitte jamais l'appareil pour être analysé.** Cette
 * fonction ne reçoit que des métadonnées. C'est une conséquence heureuse de
 * l'absence d'OCR, et une propriété à préserver le jour où l'on en branchera un.
 */

/* ═══════════════════ capacité de reconnaissance ═══════════════════ */

export type OcrCapability = {
  available: boolean;
  provider: string | null;
  /** Phrase affichable telle quelle. L'écran ne doit pas avoir à l'inventer. */
  reason: string;
};

/**
 * État réel de la reconnaissance de texte.
 *
 * ⚠️ Lit la configuration au lieu de renvoyer `false` en dur : le jour où un
 * fournisseur est branché, cette fonction dira « disponible » sans qu'aucun
 * écran ne change. `OCR_PROVIDER` n'est **pas** documenté comme fonctionnel —
 * c'est le point d'accroche, et la variable est absente de `.env.example` tant
 * qu'aucune intégration n'a été auditée.
 */
export function ocrCapability(): OcrCapability {
  const provider = process.env.OCR_PROVIDER?.trim() || null;
  if (!provider) {
    return {
      available: false,
      provider: null,
      reason:
        "Aucun moteur de reconnaissance de texte n'est configuré sur cette installation. " +
        "Les pièces ne sont donc envoyées à aucun service extérieur, et le classement se fait à la main.",
    };
  }
  // Un fournisseur nommé mais non implémenté reste indisponible : annoncer le
  // contraire ferait attendre une analyse qui n'arriverait jamais.
  return {
    available: false,
    provider,
    reason: `Le fournisseur « ${provider} » est déclaré mais aucune intégration n'est encore installée.`,
  };
}

/* ═══════════════════ similarité ═══════════════════ */

/** Sans accents, sans ponctuation, en minuscules — « Diallo » = « DIALLO ». */
export function normalize(s: string): string {
  return s
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Mots utiles d'un nom de fichier : l'extension et les compteurs ne disent rien. */
export function tokens(s: string): string[] {
  return normalize(s.replace(/\.[a-z0-9]{1,5}$/i, ""))
    .split(" ")
    .filter((t) => t.length >= 3 && !/^\d+$/.test(t));
}

/**
 * Jaro-Winkler — similarité de deux chaînes, entre 0 et 1.
 *
 * Choisi parce qu'il favorise les préfixes communs : « Mamadou » et « Mamadu »
 * (faute de frappe fréquente) sortent très haut, là où une distance d'édition
 * brute les éloignerait autant que deux mots sans rapport.
 */
export function jaroWinkler(a: string, b: string): number {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;

  const range = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
  const aMatched = new Array<boolean>(a.length).fill(false);
  const bMatched = new Array<boolean>(b.length).fill(false);
  let matches = 0;

  for (let i = 0; i < a.length; i++) {
    const lo = Math.max(0, i - range), hi = Math.min(i + range + 1, b.length);
    for (let j = lo; j < hi; j++) {
      if (bMatched[j] || a[i] !== b[j]) continue;
      aMatched[i] = bMatched[j] = true;
      matches++;
      break;
    }
  }
  if (matches === 0) return 0;

  let transpositions = 0, k = 0;
  for (let i = 0; i < a.length; i++) {
    if (!aMatched[i]) continue;
    while (!bMatched[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }
  const m = matches;
  const jaro = (m / a.length + m / b.length + (m - transpositions / 2) / m) / 3;

  let prefix = 0;
  while (prefix < 4 && prefix < a.length && prefix < b.length && a[prefix] === b[prefix]) prefix++;
  return jaro + prefix * 0.1 * (1 - jaro);
}

/**
 * Score d'un libellé face aux mots d'un nom de fichier.
 *
 * Chaque mot du libellé cherche son meilleur correspondant parmi les mots du
 * fichier ; le score est leur moyenne. Un libellé dont aucun mot ne se retrouve
 * tombe naturellement bas — sans seuil arbitraire dans le calcul lui-même.
 */
export function scoreAgainst(fileTokens: string[], label: string): number {
  const target = tokens(label);
  if (target.length === 0 || fileTokens.length === 0) return 0;
  const best = target.map((t) => Math.max(...fileTokens.map((f) => jaroWinkler(t, f))));
  return best.reduce((a, b) => a + b, 0) / best.length;
}

/**
 * Seuil d'affichage d'une proposition.
 *
 * ⚠️ **Ce n'est pas un seuil de vérité, c'est un seuil d'affichage.** En dessous,
 * on n'affiche pas un petit pourcentage — on écrit « correspondance incertaine ».
 * Montrer « Amadou Diallo — 41 % » pousse à cliquer sur la seule ligne proposée ;
 * ne rien proposer force à choisir sciemment.
 */
export const PROPOSAL_FLOOR = 0.72;

/* ═══════════════════ analyse ═══════════════════ */

export type Proposal<T> = T & { score: number };

export type DocumentAnalysis = {
  ocr: OcrCapability;
  /** D'où vient le texte analysé. Aujourd'hui : le nom du fichier, rien d'autre. */
  textSource: "fileName";
  analyzedText: string;
  /** Dossier d'où part l'utilisateur. Jamais changé automatiquement. */
  context: { studentId: string; name: string };
  requirements: Proposal<{ requirementId: string; label: string; category: DocCategory; hasDocument: boolean }>[];
  students: Proposal<{ studentId: string; name: string }>[];
  /** Vrai si rien d'exploitable n'a été trouvé — l'écran le dit franchement. */
  inconclusive: boolean;
};

/**
 * Analyse un document à classer.
 *
 * ⚠️ Ne reçoit **que** des métadonnées : ni le fichier, ni son contenu. Bornée
 * par `studentFile()` (donc par l'école, le périmètre de rôle et les catégories
 * autorisées) et par `studentWhereFor()` pour les élèves proposés. Un enseignant
 * ne peut donc pas se voir proposer un élève d'une autre classe, ni une exigence
 * d'une catégorie qui lui est fermée.
 */
export async function analyzeDocument(
  actor: ActorContext,
  input: { studentId: string; fileName: string },
): Promise<DocumentAnalysis | null> {
  const file = await studentFile(actor, input.studentId);
  if (!file) return null;

  const ft = tokens(input.fileName);
  const ocr = ocrCapability();

  const requirements = file.lines
    .map((l) => ({
      requirementId: l.requirementId,
      label: l.label,
      category: l.category,
      hasDocument: l.document !== null,
      score: scoreAgainst(ft, l.label),
    }))
    .filter((r) => r.score >= PROPOSAL_FLOOR)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  // Élèves du périmètre de l'appelant, jamais de l'école entière si le rôle est borné.
  const scope = await studentWhereFor(actor);
  const candidates = ft.length
    ? await prisma.student.findMany({
        where: { AND: [scope, { schoolId: actor.schoolId }] },
        select: { id: true, firstName: true, lastName: true },
        take: 500,
      })
    : [];

  const students = candidates
    .map((s) => {
      const name = `${s.firstName} ${s.lastName}`;
      return { studentId: s.id, name, score: scoreAgainst(ft, name) };
    })
    .filter((s) => s.score >= PROPOSAL_FLOOR)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return {
    ocr,
    textSource: "fileName",
    analyzedText: ft.join(" "),
    context: { studentId: file.student.id, name: `${file.student.firstName} ${file.student.lastName}` },
    requirements,
    students,
    inconclusive: requirements.length === 0 && students.length === 0,
  };
}
