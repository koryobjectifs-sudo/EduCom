/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GARDE-FOU D'ENVIRONNEMENT — point de passage OBLIGATOIRE de tout script.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ **Aucun script de ce dossier ne doit importer `src/lib/prisma`
 * directement, ni construire son propre `PrismaClient`.** Il importe `prisma`
 * ICI. `scripts/verify-gardes.ts` en fait un invariant : la protection ne vaut
 * que si elle est sur le chemin, pas à côté.
 *
 * ═══ CE QU'IL EMPÊCHE ═══
 *
 * **14 vérificateurs créent et suppriment des données** — écoles, comptes Auth,
 * élèves, notes, documents — à partir du seul `DATABASE_URL` trouvé dans
 * l'environnement. Aucun ne demandait où il écrivait. Il suffit d'un `.env`
 * recopié pour que `verify-lot-15` détruise des fixtures dans la base
 * d'établissements réels.
 *
 * ⚠️ Le premier garde-fou (19 août, matin) ne couvrait que `npm run script` :
 * `npx tsx scripts/verify-lot-15.ts` passait à côté. C'est corrigé ici — la
 * vérification est dans le **chemin d'import**, donc dans TOUS les modes
 * d'invocation.
 *
 * ═══ QUATRE SIGNAUX, ET LA PORTE EST FERMÉE PAR DÉFAUT ═══
 *
 * Ne pas se fier à une seule variable : elle s'oublie, se recopie, se vide.
 *
 *   ① EDUCOM_ENV doit valoir EXACTEMENT `development` ou `test`.
 *     Absente, vide, mal orthographiée, ou `production` → REFUS.
 *     ⚠️ C'est une autorisation POSITIVE : ne rien configurer ne donne aucun
 *     droit. Une liste de projets interdits, elle, laisse passer tout projet
 *     qu'on a oublié d'y inscrire — c'est-à-dire le projet créé demain.
 *
 *   ② La référence du projet visé doit figurer dans EDUCOM_DEV_REFS.
 *     Cette liste est déduite de `DATABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL`,
 *     donc du projet RÉELLEMENT visé, pas de ce qu'on croit viser.
 *
 *   ③ Veto : la référence visée est celle d'EDUCOM_PRODUCTION_REF.
 *     Rattrape le cas où une même référence figure par erreur dans les deux
 *     listes. Un veto l'emporte toujours sur une autorisation.
 *
 *   ④ Veto : on tourne sur Vercel (`VERCEL`). Un script d'alimentation ou de
 *     vérification n'a rien à faire dans un environnement déployé, quelle que
 *     soit la base qu'il vise. ⚠️ Ce veto n'est levable par RIEN.
 *
 * ═══ LA LEVÉE EXCEPTIONNELLE ═══
 *
 * `EDUCOM_ALLOW_PRODUCTION` doit valoir exactement la phrase ci-dessous. Un
 * `=1` se tape par réflexe et finit par dormir dans un `.env` ; une phrase
 * explicite se tape en connaissance de cause et se remarque en revue.
 * Elle ne lève JAMAIS le veto ④, et n'est **pas** documentée dans
 * `.env.example` : l'y écrire désarmerait la protection en permanence.
 */
import { prisma } from "../src/lib/prisma";

export { prisma };

const PHRASE_DE_LEVEE = "oui-je-sais-ce-que-je-fais";
const ENVIRONNEMENTS_AUTORISES = ["development", "test"] as const;

export type Environnement = (typeof ENVIRONNEMENTS_AUTORISES)[number] | "production";

const ROUGE = "\x1b[31m", GRIS = "\x1b[90m", FIN = "\x1b[0m";

/** Référence du projet Supabase RÉELLEMENT visé. */
export function referenceProjet(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const parUrl = url.match(/https:\/\/([a-z0-9]+)\.supabase\.co/);
  if (parUrl) return parUrl[1];
  const db = process.env.DATABASE_URL ?? "";
  const parDb = db.match(/postgres(?:ql)?:\/\/postgres\.([a-z0-9]+):/);
  return parDb ? parDb[1] : null;
}

/** Jamais en entier : une référence identifie le projet sur une capture d'écran. */
export const masquer = (r: string | null) => (r ? `${r.slice(0, 6)}…${r.slice(-2)}` : "inconnue");

export type Verdict =
  | { autorise: true; env: string; ref: string | null; leve: boolean }
  | { autorise: false; motif: string; detail: string; ref: string | null };

/**
 * Applique les quatre signaux. **Fonction pure** : elle ne sort pas le
 * processus, ce qui la rend testable — `scripts/verify-gardes.ts` la rejoue
 * sur des environnements simulés, sans avoir à lancer 14 sous-processus.
 */
export function evaluerEnvironnement(source: Record<string, string | undefined> = process.env): Verdict {
  const ref = (() => {
    const url = source.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const m = url.match(/https:\/\/([a-z0-9]+)\.supabase\.co/);
    if (m) return m[1];
    const d = (source.DATABASE_URL ?? "").match(/postgres(?:ql)?:\/\/postgres\.([a-z0-9]+):/);
    return d ? d[1] : null;
  })();

  const env = (source.EDUCOM_ENV ?? "").trim().toLowerCase();
  const prod = (source.EDUCOM_PRODUCTION_REF ?? "").trim();
  const devRefs = (source.EDUCOM_DEV_REFS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const leve = (source.EDUCOM_ALLOW_PRODUCTION ?? "").trim() === PHRASE_DE_LEVEE;

  // ④ — veto absolu, jamais levable.
  if (source.VERCEL) {
    return { autorise: false, ref, motif: "environnement déployé",
      detail: "`VERCEL` est défini : aucun script de test ou d'alimentation ne s'exécute dans un environnement déployé." };
  }

  // ③ — veto, levable seulement par la phrase.
  if (prod && ref && ref === prod && !leve) {
    return { autorise: false, ref, motif: "cible de PRODUCTION",
      detail: "la base visée est celle déclarée dans `EDUCOM_PRODUCTION_REF`." };
  }

  // ⑤ — l'environnement se déclare production.
  if (env === "production" && !leve) {
    return { autorise: false, ref, motif: "cible de PRODUCTION",
      detail: "`EDUCOM_ENV=production`." };
  }

  if (leve) return { autorise: true, env: env || "(non déclaré)", ref, leve: true };

  // ① — autorisation positive, fermée par défaut.
  if (!(ENVIRONNEMENTS_AUTORISES as readonly string[]).includes(env)) {
    return { autorise: false, ref, motif: "environnement non déclaré",
      detail: env
        ? `\`EDUCOM_ENV="${env}"\` n'est pas reconnu. Valeurs admises : ${ENVIRONNEMENTS_AUTORISES.join(", ")}.`
        : "`EDUCOM_ENV` est absente. Sans elle, rien ne prouve que cette base n'est pas la production." };
  }

  // ② — la base visée doit être explicitement reconnue comme non-production.
  if (devRefs.length === 0) {
    return { autorise: false, ref, motif: "base non reconnue",
      detail: "`EDUCOM_DEV_REFS` est vide : aucune base n'est déclarée comme étant de développement ou de test." };
  }
  if (!ref || !devRefs.includes(ref)) {
    return { autorise: false, ref, motif: "base non reconnue",
      detail: `la base visée (${masquer(ref)}) ne figure pas dans \`EDUCOM_DEV_REFS\`.` };
  }

  return { autorise: true, env, ref, leve: false };
}

/** Applique le verdict : message lisible, et sortie en échec si refus. */
export function exigerEnvironnementSur(): void {
  const v = evaluerEnvironnement();

  if (!v.autorise) {
    console.error(`\n${ROUGE}⛔ REFUS — ${v.motif}${FIN}\n`);
    console.error(`   Base visée : ${masquer(v.ref)}`);
    console.error(`   Motif      : ${v.detail}\n`);
    console.error("   Les scripts de ce dossier créent ET SUPPRIMENT des données.");
    console.error("   Aucun ne doit s'exécuter contre des établissements réels.\n");
    console.error(`   ${GRIS}Configurer EDUCOM_ENV et EDUCOM_DEV_REFS (voir .env.example).${FIN}\n`);
    process.exit(1);
  }

  if (v.leve) {
    console.error(`\n${ROUGE}⚠️  GARDE-FOU LEVÉ EXPLICITEMENT${FIN}`);
    console.error(`   Base ${masquer(v.ref)} — tout ce qui sera écrit le sera sur des données réelles.\n`);
  } else {
    console.error(`${GRIS}▸ ${v.env} · base ${masquer(v.ref)}${FIN}`);
  }
}

// ⚠️ Effet de bord à l'import : c'est le principe même. Un garde-fou qu'il faut
// penser à appeler est un garde-fou qu'on oublie d'appeler.
exigerEnvironnementSur();
