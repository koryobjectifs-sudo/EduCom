import { NextRequest } from "next/server";
import { requireActionContext } from "@/lib/actionContext";
import { recordAudit } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { BUCKET } from "@/lib/studentFile";
import { zipStream, safeSegment, type ZipEntry } from "@/lib/zip";
import { multiExportPlan, exportFileNameFor, type StudentExportPlan } from "@/lib/exportDossier";

/**
 * Téléchargement d'un export de dossiers, en flux. Lot 16.
 *
 * ⚠️ **Pourquoi `/export/download` et non `/export`.** Next.js interdit qu'une
 * route et une page vivent au même chemin — et il ne le dit pas à la
 * compilation : `tsc` reste propre, les vérificateurs passent, et c'est
 * l'application ENTIÈRE qui tombe en 500, y compris `/login`. Découvert par la
 * sonde runtime du lot 16, jamais autrement. Troisième défaut de cette famille
 * après le lot 13 (bundle client) et le lot 15 (client Prisma périmé).
 *
 * ═══ POURQUOI UNE ROUTE ET NON UNE SERVER ACTION ═══
 *
 * Une server action renvoie des données à du JavaScript ; elle ne peut pas
 * remettre un fichier de plusieurs mégaoctets au navigateur sans le faire
 * transiter par la mémoire du client. Une route rend une `Response` dont le
 * corps est un **flux** : le ZIP part au fur et à mesure qu'il s'écrit.
 *
 * ⚠️ **C'est une porte HTTP à part entière** — appelable directement, avec des
 * identifiants devinés. Elle refait donc TOUS les contrôles : session, chemin
 * autorisé, puis `multiExportPlan()`, qui filtre les élèves par le périmètre du
 * rôle avant de construire quoi que ce soit. Un identifiant d'élève dans l'URL
 * ne prouve rien.
 *
 * ═══ MÉMOIRE ═══
 *
 * ⚠️ Les pièces sont téléchargées **une par une** depuis Storage, écrites dans
 * le flux, puis relâchées. La mémoire haute est celle d'un seul document (10 Mo
 * au maximum, limite du lot 13), jamais celle de l'export entier. Aucun fichier
 * temporaire n'est créé — ni sur disque, ni dans Storage : il n'y a donc rien à
 * nettoyer, et aucune seconde copie ne peut subsister.
 */

const READ_PATH = "/dashboard/students";

export async function GET(request: NextRequest) {
  const auth = await requireActionContext(READ_PATH);
  if (!auth.ok) return new Response(auth.error, { status: 403 });
  const { ctx } = auth;

  const params = request.nextUrl.searchParams;
  const ids = (params.get("students") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const includeVersions = params.get("versions") === "1";
  const groupLabel = params.get("label");

  if (ids.length === 0) return new Response("Aucun élève sélectionné.", { status: 400 });

  const { plans, requested, accessible } = await multiExportPlan(ctx, ids, { includeVersions });
  if (plans.length === 0) {
    // Message identique qu'il s'agisse d'élèves inexistants ou interdits :
    // distinguer les deux confirmerait l'existence des seconds.
    return new Response("Aucun dossier exportable parmi la sélection.", { status: 404 });
  }

  const documentCount = plans.reduce((n, p) => n + p.entries.length, 0);
  if (documentCount === 0) {
    return new Response(
      "Les dossiers sélectionnés ne contiennent aucune pièce à exporter.",
      { status: 409 },
    );
  }

  const fileName = exportFileNameFor(plans, groupLabel ?? undefined);
  const supabase = createAdminClient();
  const multi = plans.length > 1;

  // ⚠️ La trace est écrite AVANT l'envoi : si le flux casse en route, on saura
  // quand même qu'un export a été demandé, par qui et sur quels dossiers.
  await recordAudit(ctx, {
    action: "export.dossier",
    entity: "transmission",
    entityId: crypto.randomUUID(),
    outcome: "success",
    details: {
      fileName, requested, accessible, documentCount, includeVersions,
      students: plans.map((p) => ({ id: p.studentId, name: p.studentName, documents: p.entries.length, state: p.state })),
      missingTotal: plans.reduce((n, p) => n + p.missing.length, 0),
    },
  });

  async function* entries(): AsyncGenerator<ZipEntry> {
    for (const plan of plans) {
      const root = multi ? `${plan.folder}/` : "";

      for (const entry of plan.entries) {
        const { data, error } = await supabase.storage.from(BUCKET).download(entry.storagePath);
        // ⚠️ Une pièce introuvable dans Storage n'interrompt pas l'export et ne
        // produit **aucun faux fichier** : elle est signalée dans le résumé.
        if (error || !data) continue;
        yield { path: `${root}${entry.path}`, bytes: new Uint8Array(await data.arrayBuffer()) };
      }

      // Résumé lisible : ce que l'archive NE contient pas, et pourquoi.
      yield { path: `${root}RESUME.txt`, bytes: new TextEncoder().encode(summary(plan)) };
    }
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of zipStream(entries())) controller.enqueue(chunk);
        controller.close();
      } catch (e) {
        controller.error(e);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/zip",
      // `filename*` porte l'UTF-8 : « Dossier-Aminata-Ndiaye » sans accents cassés.
      "Content-Disposition": `attachment; filename="${safeSegment(fileName)}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "no-store",
    },
  });
}

/**
 * Résumé texte joint à chaque dossier.
 *
 * ⚠️ **Aucun faux fichier « document-manquant.pdf ».** Ce qui manque est écrit
 * dans un résumé lisible ; fabriquer un PDF vide pour chaque pièce absente
 * remplirait l'archive de documents qui n'existent pas.
 */
function summary(plan: StudentExportPlan): string {
  const c = plan.completeness;
  const lines = [
    `DOSSIER — ${plan.studentName}`,
    "",
    `Export préparé par EduCom le ${new Date().toLocaleString("fr-FR")}.`,
    "Ce résumé accompagne l'archive : il dit ce qu'elle contient, et ce qui manque.",
    "",
    `État du dossier : ${plan.state}`,
    c.configured
      ? `Pièces exigées : ${c.required} — reçues : ${c.received} (${c.percent} %)`
      : "Aucune checklist n'est configurée pour cet élève : la complétude n'est pas calculable.",
    `Pièces jointes à cette archive : ${plan.entries.length}`,
    "",
  ];

  if (plan.missing.length > 0) {
    lines.push("PIÈCES ABSENTES OU À REFAIRE :");
    for (const m of plan.missing) {
      const why = m.reason === "MISSING" ? "jamais reçue" : m.reason === "REJECTED" ? "rejetée, à refournir" : "expirée, à renouveler";
      lines.push(`  - ${m.label} (${m.category}) — ${why}`);
    }
    lines.push("");
  } else if (c.configured) {
    lines.push("Aucune pièce ne manque.", "");
  }

  if (plan.excludedCategories.length > 0) {
    lines.push(
      "CATÉGORIES NON INCLUSES, faute de droits d'accès de la personne ayant préparé cet export :",
      `  ${plan.excludedCategories.join(", ")}`,
      "",
    );
  }

  lines.push(
    "Cet export a été préparé depuis EduCom. Il ne constitue pas une transmission",
    "officielle : EduCom n'est connecté à aucune administration.",
  );
  return lines.join("\n");
}
