import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, ChevronRight, FileText, ReceiptText, FileBadge, FolderOpen, AlertTriangle, Check } from "lucide-react";
import { statusLabel } from "@/lib/status";
import { canSeeHealthData } from "@/lib/studentScope";
import { hasAccess } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { BUCKET } from "@/lib/studentFile";
import { AvatarPhoto } from "./AvatarPhoto";
import { loadStudent360, SECTIONS, sectionValide } from "./data";
import {
  VoletEleve, SectionApercu, SectionScolarite, SectionPresence,
  SectionNotes, SectionFinance, SectionFamille, SectionDocuments,
} from "./sections";

/**
 * Fiche élève — « Student 360 ».
 *
 * ═══ CE QUI A CHANGÉ, ET POURQUOI ═══
 *
 * La fiche était une page unique de cinq cartes. Elle disait qui était l'élève,
 * mais rien de ce que l'établissement sait de lui : ni assiduité, ni résultats,
 * ni bulletins, ni échanges avec la famille. **Ces données existaient toutes
 * dans le schéma** et n'étaient rattachées à l'élève sur aucun écran.
 *
 * La structure reprend le modèle d'interaction d'une fiche RH professionnelle —
 * identité en ancre, volet de contexte permanent, sections navigables — et le
 * remplit avec ce qui compte dans une école. La thèse de la vue générale vient
 * de la recherche sur les systèmes d'information scolaires : **voir la présence,
 * les résultats et l'argent au même endroit** est ce qui permet d'intervenir
 * avant que la situation ne s'installe. C'est exactement ce qu'aucun écran
 * d'EduCom ne permettait.
 *
 * ⚠️ **Aucune route nouvelle.** Les sections sont un paramètre de requête
 * (`?section=`) rendu par le serveur : l'URL reste `/dashboard/students/[id]`,
 * chaque section est partageable, et rien n'est masqué derrière un état client.
 *
 * ⚠️ **Aucune donnée inventée.** Chaque bloc lit une table existante. Quand la
 * donnée n'existe pas, l'écran l'écrit (« Aucun appel enregistré ») au lieu
 * d'afficher un zéro qui ressemblerait à une alerte.
 *
 * ⚠️ **Les bornes de rôle sont inchangées** : `studentWhereFor()` décide quel
 * élève est visible, `canSeeHealthData()` décide si le médical est RENDU — il
 * n'est jamais masqué en CSS.
 */

/* Le langage des boutons du produit, appliqué à des liens de navigation.
   Les classes sont celles de la primitive `Button` (variantes primary et
   secondary) : la fiche n'introduit aucun style nouveau. */
const ACTION_BASE =
  "inline-flex items-center justify-center gap-2 rounded-control px-3 h-10 text-role-label font-medium shadow-card transition-colors " +
  "pointer-coarse:min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";
/* ⚠️ Ces actions vivent sur le BANDEAU, pas sur une surface blanche. Un bouton
   `bg-primary` y disparaîtrait (même famille de couleur que le fond) et un
   bouton `bg-surface text-text` y ferait une tache grise. La principale devient
   donc blanche pleine, les secondaires des contours blancs translucides —
   c'est le contraste avec le bandeau qui porte la hiérarchie. */
const ACTION_PRINCIPALE = `${ACTION_BASE} bg-white text-band border border-transparent hover:bg-white/90 active:bg-white/80`;
const ACTION_NEUTRE = `${ACTION_BASE} bg-white/10 text-white border border-white/30 hover:bg-white/20 active:bg-white/25`;

export default async function StudentProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ section?: string }>;
}) {
  const { id } = await params;
  const { section } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser?.schoolId) return null;

  // ⚠️ Lot 13.1 — cet écran n'était borné que par l'école. Il porte le groupe
  // sanguin, les notes médicales et le lien vers le dossier : la borne de rôle
  // manquait, exactement comme sur le dossier lui-même (audit du lot 13).
  const actor = { userId: dbUser.id, schoolId: dbUser.schoolId, role: dbUser.role };
  const health = canSeeHealthData(actor);

  const d = await loadStudent360(actor, id);

  if (!d) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Élève introuvable</h2>
        <Link href="/dashboard/students" className="text-primary hover:underline mt-4 inline-block">
          Retour aux élèves
        </Link>
      </div>
    );
  }

  const { student, completeness } = d;
  const active = sectionValide(section);
  const currentEnrollment = student.enrollments[0];
  const initiales = `${student.firstName[0] ?? ""}${student.lastName[0] ?? ""}`.toUpperCase();
  const matricule = student.id.split("-")[0].toUpperCase();

  // ⚠️ Le bucket est PRIVÉ. On ne transmet jamais `photoPath` au navigateur :
  // seulement une URL signée à durée courte, calculée après que le chargement
  // ci-dessus a déjà borné l'élève par `studentWhereFor()`. Un acteur hors
  // périmètre n'atteint pas cette ligne : `d` est nul et la page a rendu
  // « Élève introuvable ».
  let photoUrl: string | null = null;
  if (student.photoPath) {
    const { data } = await createAdminClient().storage
      .from(BUCKET)
      .createSignedUrl(student.photoPath, 300);
    photoUrl = data?.signedUrl ?? null;
  }
  // Voir l'élève ne donne pas le droit de le modifier — même règle que la
  // server action, qui refait le contrôle côté serveur de toute façon.
  const peutModifier = hasAccess(dbUser.role, "/dashboard/students");

  return (
    <div className="space-y-6 max-w-7xl pb-12">

      {/* ═══════════ BANDEAU D'IDENTITÉ ═══════════
          Le bandeau coloré porte l'identité, les actions et les onglets ; la
          photo le CHEVAUCHE par le bas. C'est la disposition qui donne à une
          fiche son ancrage : l'élève est identifié avant toute donnée.

          ⚠️ Pas d'`overflow-hidden` sur cet en-tête — il rognerait justement le
          débordement de la photo, qui est tout l'effet recherché. */}
      <header className="relative rounded-surface bg-band p-5 shadow-card sm:mb-12 sm:p-6 sm:pl-[13rem]">

        <div className="mb-4 flex items-center gap-2">
          <Link
            href="/dashboard/students"
            aria-label="Retour aux élèves et dossiers"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-control text-white/70 transition-colors hover:bg-white/15 hover:text-white pointer-coarse:min-h-11 pointer-coarse:min-w-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          </Link>
          <nav aria-label="Fil d'Ariane" className="min-w-0">
            <ol className="flex flex-wrap items-center gap-1 text-role-meta text-white/60">
              {/* ⚠️ `min-h-11` sur pointeur grossier : mesurés au doigt, ces deux
                  liens faisaient 15 et 18 px de haut. Le fil d'Ariane reste un
                  moyen de navigation, donc une cible — l'apparence ne change pas
                  à la souris, seule la zone tactile grandit. */}
              <li className="flex items-center">
                <Link href="/dashboard" className="inline-flex items-center transition-colors hover:text-white pointer-coarse:min-h-11">Accueil</Link>
              </li>
              <li className="flex items-center gap-1">
                <ChevronRight aria-hidden="true" className="h-3 w-3 shrink-0" />
                <Link href="/dashboard/students" className="inline-flex items-center transition-colors hover:text-white pointer-coarse:min-h-11">Élèves &amp; dossiers</Link>
              </li>
              <li className="flex items-center gap-1">
                <ChevronRight aria-hidden="true" className="h-3 w-3 shrink-0" />
                <span aria-current="page" className="text-white/85">Fiche élève</span>
              </li>
            </ol>
          </nav>
        </div>

        {/* L'identité est l'ancre visuelle ; les actions la suivent, et passent
            sous elle dès que la largeur ne permet plus de les mettre en regard. */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between lg:gap-8">

          <div className="flex min-w-0 items-center gap-4 sm:items-start sm:gap-6">
            {/* ⚠️ La marge basse NÉGATIVE est ce qui fait déborder la photo sous
                le bandeau : elle retire de la hauteur au bandeau sans déplacer
                la photo. Le `<div className="h-14">` en pied d'en-tête rend
                cette place, sinon la photo mordrait sur le contenu suivant.
                Sous 640 px il n'y a pas de débordement — la place manque, et
                une photo à cheval sur deux fonds y serait illisible. */}
            <div className="shrink-0 sm:absolute sm:bottom-0 sm:left-6 sm:translate-y-[30%]">
              <AvatarPhoto
                studentId={student.id}
                initiales={initiales}
                photoUrl={photoUrl}
                modifiable={peutModifier}
              />
            </div>

            {/* Matricule, classe et statut tiennent sur UNE ligne : c'est ce qui
                distingue une fiche d'une pile de champs. Ils passent à la ligne
                d'eux-mêmes sous 640 px plutôt que de se comprimer. */}
            <div className="min-w-0">
              <p className="text-role-meta font-medium uppercase tracking-wide text-white/60">Élève</p>
              <h1 className="mt-1 text-[30px] font-semibold leading-tight tracking-tight text-white break-words sm:text-[36px]">
                {student.firstName} {student.lastName}
              </h1>

              <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2 text-role-label">
                <span className="text-white/70">
                  <span className="text-white/50">Matricule</span>{" "}
                  <span className="font-medium text-white tabular-nums">{matricule}</span>
                </span>
                <span aria-hidden="true" className="hidden h-3 w-px bg-white/25 sm:inline-block" />
                <span className="text-white/70">
                  <span className="text-white/50">Classe</span>{" "}
                  <span className="font-medium text-white">{currentEnrollment?.class?.name || "Sans classe"}</span>
                </span>
                <span aria-hidden="true" className="hidden h-3 w-px bg-white/25 sm:inline-block" />
                {/* ⚠️ Pas de `StatusBadge` ici. La primitive dessine une pastille
                    claire à texte coloré, pensée pour un fond blanc : sur le
                    bandeau, « Inscrit » y devenait un vert pâle sur bleu, sous le
                    seuil de lisibilité. Le statut est repris en clair, et la
                    primitive reste inchangée pour tout le reste du produit. */}
                <span className="inline-flex items-center gap-1.5 rounded-pill bg-white/15 px-2.5 py-1 text-role-meta font-medium text-white ring-1 ring-inset ring-white/25">
                  <span aria-hidden="true" className="h-1.5 w-1.5 rounded-pill bg-white/80" />
                  {statusLabel("student", student.status)}
                </span>

                {/* ⚠️ Le badge de complétude vient du MÊME `completeness` que
                    le dossier affiche — voir `data.ts`. Il n'existe que si une
                    checklist est configurée : afficher « 0 % » sur une école
                    qui n'exige encore aucune pièce dirait que le dossier est
                    vide, alors que c'est la règle qui manque. Cliquable, il
                    mène directement au hub documentaire — pas seulement un
                    chiffre, une porte d'entrée. */}
                {completeness && completeness.configured && (
                  <>
                    <span aria-hidden="true" className="hidden h-3 w-px bg-white/25 sm:inline-block" />
                    <Link
                      href={`/dashboard/students/${student.id}/dossier`}
                      className={`inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-role-meta font-semibold ring-1 ring-inset transition-colors pointer-coarse:min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${
                        completeness.percent === 100
                          ? "bg-success/20 text-white ring-success/40 hover:bg-success/30"
                          : "bg-warning/20 text-white ring-warning/40 hover:bg-warning/30"
                      }`}
                    >
                      {completeness.percent === 100 ? (
                        <Check aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <AlertTriangle aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                      )}
                      Dossier {completeness.percent} % complet
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Mêmes quatre destinations qu'avant. Le dossier est la principale :
              c'est le point d'entrée du lot 13, le plus utilisé au quotidien. */}
          <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
            <Link href={`/dashboard/students/${student.id}/dossier`} className={ACTION_PRINCIPALE}>
              <FolderOpen aria-hidden="true" className="h-4 w-4" /> Dossier
            </Link>
            <Link href={`/dashboard/documents/certificate?studentId=${student.id}`} className={ACTION_NEUTRE}>
              <FileBadge aria-hidden="true" className="h-4 w-4" /> Certificat
            </Link>
            <Link href={`/dashboard/grades/report-card?studentId=${student.id}`} className={ACTION_NEUTRE}>
              <FileText aria-hidden="true" className="h-4 w-4" /> Bulletin
            </Link>
            <Link href={`/dashboard/payments/invoice?studentId=${student.id}`} className={ACTION_NEUTRE}>
              <ReceiptText aria-hidden="true" className="h-4 w-4" /> Facturer
            </Link>
          </div>
        </div>

        {/* ═══ NAVIGATION DE FICHE ═══

            ⚠️ Ce sont des LIENS, pas un état client : chaque section a son URL,
            elle est partageable, et le retour arrière du navigateur fonctionne.
            Aucune route n'est ajoutée — `?section=` reste la même page.

            ⚠️ `overflow-x-auto` sur la barre et `min-w-max` sur la liste : sous
            390 px les sept entrées ne tiennent pas, elles défilent DANS la barre
            au lieu de faire déborder la page. */}
        <nav aria-label="Sections de la fiche" className="-mx-5 mt-5 overflow-x-auto px-5 sm:-mx-6 sm:mt-6 sm:px-6">
          <ul className="flex min-w-max items-center gap-6">
            {SECTIONS.map((s) => {
              const actif = s.cle === active;
              return (
                <li key={s.cle}>
                  <Link
                    href={`/dashboard/students/${student.id}?section=${s.cle}`}
                    aria-current={actif ? "page" : undefined}
                    className={`inline-flex items-center whitespace-nowrap rounded-t-control px-3 pt-2.5 pb-2 text-role-label font-medium transition-colors pointer-coarse:min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${
                      actif
                        ? "bg-surface text-band shadow-card"
                        : "text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {s.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>

      {/* ═══════════ VOLET PERMANENT + SECTION ═══════════

          Le volet reste affiché quelle que soit la section : c'est ce qui évite
          de perdre l'élève de vue en consultant ses notes. Sous 1024 px il passe
          AU-DESSUS du contenu, où il joue son rôle de résumé. */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <aside className="lg:col-span-4 xl:col-span-3">
          <VoletEleve d={d} health={health} />
        </aside>

        <main className="lg:col-span-8 xl:col-span-9">
          {active === "apercu" && <SectionApercu d={d} studentId={student.id} />}
          {active === "scolarite" && <SectionScolarite d={d} />}
          {active === "presence" && <SectionPresence d={d} />}
          {active === "notes" && <SectionNotes d={d} />}
          {active === "finance" && <SectionFinance d={d} studentId={student.id} />}
          {active === "famille" && <SectionFamille d={d} health={health} />}
          {active === "documents" && <SectionDocuments d={d} studentId={student.id} />}
        </main>
      </div>
    </div>
  );
}
