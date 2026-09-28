import Link from "next/link";
import { requirePathAccess } from "@/lib/documentContext";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import {
  Sparkles,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  Calendar,
  GraduationCap,
  Calculator,
  UserCheck,
  Building2,
  ExternalLink,
} from "lucide-react";
import { getOnboardingConfig } from "@/lib/onboarding-metiers";

export default async function GuideMetierPage({
  searchParams,
}: {
  searchParams: Promise<{ metier?: string }>;
}) {
  const ctx = await requirePathAccess("/dashboard/aide");
  const { metier } = await searchParams;

  const roleAffiche = metier
    ? metier.toUpperCase()
    : ctx.role;

  const config = getOnboardingConfig(roleAffiche);

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      <PageHeader
        breadcrumb={[
          { label: "Accueil", href: "/dashboard" },
          { label: "Aide & support", href: "/dashboard/aide" },
          { label: `Guide ${config.nomMetier}` },
        ]}
        title={`Guide Pratique · Espace ${config.nomMetier}`}
        description="Mode d'emploi pas-à-pas illustré de vraies captures d'écran pour maîtriser votre quotidien sur EduCom."
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/aide"
              className="inline-flex h-8.5 items-center rounded-control border border-rule bg-surface px-3 text-role-label font-medium text-text hover:bg-sunk"
            >
              Écrire au support
            </Link>
          </div>
        }
      />

      {/* Sélecteur de métier pour les curieux ou la direction */}
      {(ctx.role === "OWNER" || ctx.role === "ADMIN") && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-rule/70 bg-sunk/30 p-2 text-xs">
          <span className="font-semibold text-text-soft px-2">Voir le guide pour :</span>
          {[
            { id: "TEACHER", label: "Enseignant" },
            { id: "ACCOUNTANT", label: "Comptable" },
            { id: "SECRETARY", label: "Secrétariat" },
            { id: "OWNER", label: "Direction" },
          ].map((m) => (
            <Link
              key={m.id}
              href={`/dashboard/aide/guide?metier=${m.id}`}
              className={`rounded-lg px-3 py-1 font-medium transition-colors ${
                roleAffiche === m.id
                  ? "bg-primary text-white shadow-2xs font-semibold"
                  : "bg-surface hover:bg-sunk text-text border border-rule/50"
              }`}
            >
              {m.label}
            </Link>
          ))}
        </div>
      )}

      {/* ── SECTION 1 : SYNTHÈSE DU MÉTIER & ACTIONS CLÉS ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {config.etapes.map((etape, i) => (
          <Link
            key={etape.id}
            href={etape.lien}
            className="group relative rounded-xl border border-rule bg-surface p-4 shadow-2xs hover:border-primary/50 hover:shadow-xs transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-1 text-[11px] font-bold text-primary">
                <span>Étape {i + 1}</span>
                {etape.badge && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.2 text-[9.5px]">
                    {etape.badge}
                  </span>
                )}
              </div>
              <h4 className="mt-1 text-xs font-bold text-text group-hover:text-primary transition-colors">
                {etape.titre}
              </h4>
              <p className="mt-1 text-[11px] leading-relaxed text-text-soft">
                {etape.description}
              </p>
            </div>
            <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-primary opacity-80 group-hover:opacity-100">
              <span>Ouvrir l&apos;écran</span>
              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>
        ))}
      </div>

      {/* ── SECTION 2 : MODE D'EMPLOI PAS-À-PAS AVEC VRAIES CAPTURES (ENSEIGNANT D'ABORD) ── */}
      <div className="space-y-6">
        <h3 className="text-base font-bold text-text flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <span>Visite guidée détaillée des écrans clés</span>
        </h3>

        {/* ÉCRAN 1 : LE TABLEAU DE BORD ENSEIGNANT */}
        <Card
          title="1. Votre Tableau de Bord Quotidien"
          description="L'accueil vous montre immédiatement ce qui nécessite votre attention aujourd'hui."
        >
          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-rule shadow-sm">
              <img
                src="/images/guide/guide-dashboard.png"
                alt="Tableau de bord Enseignant réel EduCom"
                className="w-full object-cover"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3 text-xs">
              <div className="rounded-lg border border-rule/60 bg-sunk/30 p-3 space-y-1">
                <p className="font-bold text-text">Bandeau d&apos;appel du jour</p>
                <p className="text-[11px] text-text-soft">
                  Si vous êtes professeur titulaire, un bouton jaune vous signale si l&apos;appel de votre classe n&apos;est pas encore validé.
                </p>
              </div>

              <div className="rounded-lg border border-rule/60 bg-sunk/30 p-3 space-y-1">
                <p className="font-bold text-text">Cartes d&apos;avancement</p>
                <p className="text-[11px] text-text-soft">
                  Suivez en direct votre pourcentage de saisie de notes pour le trimestre en cours et vos classes affectées.
                </p>
              </div>

              <div className="rounded-lg border border-rule/60 bg-sunk/30 p-3 space-y-1">
                <p className="font-bold text-text">Indice pédagogique</p>
                <p className="text-[11px] text-text-soft">
                  L&apos;anneau circulaire synthétise la complétion de vos devoirs et la régularité des présences.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* ÉCRAN 2 : SAISIE DES NOTES ET BULLETINS */}
        <Card
          title="2. Saisie des Notes & Évaluations"
          description="Enregistrez devoirs et compositions en toute sérénité. Tout est calculé automatiquement."
        >
          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-rule shadow-sm">
              <img
                src="/images/guide/guide-saisie-notes.png"
                alt="Écran de notes réel EduCom"
                className="w-full object-cover"
              />
            </div>

            <div className="space-y-2 text-xs leading-relaxed text-text">
              <p>
                <strong>Comment procéder :</strong>
              </p>
              <ol className="list-decimal pl-5 space-y-1.5 text-text-soft text-xs">
                <li>
                  Rendez-vous dans l&apos;espace <strong>Pédagogie</strong> via la barre de gauche.
                </li>
                <li>
                  Sélectionnez votre classe puis la matière concernée (ex: Mathématiques, Français).
                </li>
                <li>
                  Créez une évaluation (Devoir sur table, Interrogation, Composition) et indiquez le barème (/20 ou /10).
                </li>
                <li>
                  Saisissez les notes au kilomètre : la touche <strong>Entrée</strong> vous fait passer automatiquement à l&apos;élève suivant.
                </li>
                <li>
                  Les moyennes trimestrielles et les rangs sont calculés instantanément dans le bulletin officiel.
                </li>
              </ol>
            </div>
          </div>
        </Card>

        {/* ÉCRAN 3 : FEUILLE DE PRÉSENCE & APPEL EN 1 CLIC */}
        <Card
          title="3. Feuille de Présence & Registre d'Appel"
          description="Gérez les absences et retards sans papier, en moins de 30 secondes."
        >
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs space-y-2">
            <p className="font-bold text-primary">Un fonctionnement simple et direct :</p>
            <p className="text-text leading-relaxed">
              Tous vos élèves sont par défaut marqués <strong>Présents</strong>. Vous n&apos;avez qu&apos;à cliquer sur les élèves absents ou en retard pour changer leur statut, puis cliquer sur <strong>« Valider l&apos;appel »</strong>.
            </p>
            <p className="text-text-soft">
              L&apos;information remonte instantanément à la vie scolaire et au secrétariat, sans aucun transfert papier.
            </p>
          </div>
        </Card>
      </div>

      {/* Rassurance finale */}
      <div className="rounded-2xl border border-rule bg-surface p-6 text-center space-y-3 shadow-xs">
        <h4 className="text-sm font-bold text-text">
          Une question ou besoin d&apos;assistance ?
        </h4>
        <p className="text-xs text-text-soft max-w-lg mx-auto">
          L&apos;équipe EduCom est à vos côtés. Cliquez sur le bouton « Aide » en bas à droite pour nous poser une question ou nous signaler un besoin.
        </p>
        <Link
          href="/dashboard/aide?nouveau=1"
          className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-xs font-bold text-white shadow-xs hover:bg-primary-hover transition-colors"
        >
          <span>Poser une question à l&apos;équipe</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
