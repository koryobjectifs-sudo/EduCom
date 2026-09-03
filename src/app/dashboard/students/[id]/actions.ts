"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireActionContext } from "@/lib/actionContext";
import { canSeeStudent } from "@/lib/studentScope";
import { BUCKET, storagePathFor } from "@/lib/studentFile";
import { checkFile, sanitizeFileName } from "@/lib/studentFileLimits";

/**
 * Photo de l'élève.
 *
 * ═══ POURQUOI CETTE ACTION EXISTE, ET CE QU'ELLE NE FAIT PAS ═══
 *
 * ⚠️ **La photo n'est pas une pièce du dossier.** Le dossier élève est une
 * checklist administrative soumise à validation et à des catégories de
 * permission ; y verser un portrait aurait modifié le contenu du dossier
 * existant et fait apparaître une ligne « à vérifier » qui n'a pas de sens.
 * La photo vit donc dans `Student.photoPath`, mais **dans le même bucket privé**
 * et avec les mêmes helpers que les pièces : rien de neuf côté stockage.
 *
 * ⚠️ **Trois verrous, tous côté serveur.** Une server action est un point
 * d'entrée HTTP : elle est appelable avec un `studentId` deviné, sans jamais
 * ouvrir l'écran qui l'invoque.
 *   1. `requireActionContext("/dashboard/students")` — session + droit d'accès
 *      au module élèves, exactement comme `createStudent`.
 *   2. `canSeeStudent()` — l'élève doit être dans le périmètre de l'acteur ;
 *      un enseignant ne peut pas photographier l'élève d'une autre classe.
 *   3. `updateMany({ where: { id, schoolId } })` — le `schoolId` de la session
 *      borne l'écriture, jamais celui reçu du client.
 *
 * ⚠️ **Images seulement.** `checkFile` accepte aussi le PDF pour les pièces du
 * dossier ; ici le type doit commencer par `image/`, sinon un PDF finirait dans
 * un `<img>`.
 */
export async function setStudentPhoto(
  _prev: { error?: string; ok?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const auth = await requireActionContext("/dashboard/students");
  if (!auth.ok) return { error: auth.error };
  const ctx = auth.ctx;

  const studentId = String(formData.get("studentId") ?? "");
  if (!studentId) return { error: "Élève non précisé." };

  // Message volontairement identique au cas « hors périmètre » : distinguer les
  // deux confirmerait l'existence de l'élève à qui n'a pas le droit de le voir.
  const INTROUVABLE = { error: "Élève introuvable dans votre établissement." };
  if (!(await canSeeStudent(ctx, studentId))) return INTROUVABLE;

  // ⚠️ `getAll`, pas `get` : le formulaire porte DEUX champs nommés « photo »
  // (importer / photographier). `get` renverrait toujours le premier, donc un
  // fichier vide dès que l'utilisateur passe par l'appareil photo.
  const file = formData.getAll("photo").find((v): v is File => v instanceof File && v.size > 0);
  if (!file) return { error: "Aucune image reçue." };

  if (!file.type.startsWith("image/")) {
    return { error: "Seules les images sont acceptées (JPEG, PNG, WEBP, HEIC)." };
  }
  const verdict = checkFile(file.type, file.name, file.size);
  if (!verdict.ok) return { error: verdict.error };

  const existant = await prisma.student.findFirst({
    where: { id: studentId, schoolId: ctx.schoolId },
    select: { photoPath: true },
  });
  if (!existant) return INTROUVABLE;

  const cleanName = sanitizeFileName(file.name);
  // `storagePathFor` cloisonne par école puis par élève — même arborescence que
  // les pièces du dossier. L'identifiant fixe « photo » suffit : une seule photo
  // courante par élève, et l'ancien objet est retiré juste après.
  const path = storagePathFor(ctx.schoolId, studentId, `photo-${crypto.randomUUID()}`, cleanName);

  const supabase = createAdminClient();

  // 1. Le binaire d'abord : si l'envoi échoue, aucune ligne ne pointera vers un
  //    objet inexistant. Même ordre que le dépôt d'une pièce du dossier.
  const bytes = Buffer.from(await file.arrayBuffer());
  const up = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType: file.type,
    upsert: false,
  });
  if (up.error) return { error: `Envoi de la photo impossible : ${up.error.message}` };

  // 2. Puis le chemin en base.
  try {
    await prisma.student.updateMany({
      where: { id: studentId, schoolId: ctx.schoolId },
      data: { photoPath: path },
    });
  } catch (e) {
    await supabase.storage.from(BUCKET).remove([path]);
    return { error: `Enregistrement impossible : ${e instanceof Error ? e.message : "erreur inconnue"}` };
  }

  // 3. L'ancienne photo ne sert plus. Son échec de suppression ne doit pas faire
  //    échouer l'opération : la nouvelle est déjà en place et référencée.
  if (existant.photoPath && existant.photoPath !== path) {
    await supabase.storage.from(BUCKET).remove([existant.photoPath]).catch(() => {});
  }

  revalidatePath(`/dashboard/students/${studentId}`);
  return { ok: true };
}
