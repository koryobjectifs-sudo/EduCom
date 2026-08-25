import { requireSchoolContext } from "@/lib/documentContext";
import { dashboardSnapshot } from "@/lib/dashboard";
import { Reveal } from "@/components/dashboard/Motion";
import MorningBrief from "@/components/dashboard/MorningBrief";
import AttentionCenter from "@/components/dashboard/AttentionCenter";
import SchoolHealth from "@/components/dashboard/SchoolHealth";
import TodayPanel from "@/components/dashboard/TodayPanel";
import { FinanceSummary, AcademicSummary, ParentsSummary } from "@/components/dashboard/Summaries";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import RecentInvoices from "@/components/dashboard/RecentInvoices";
import PremiersPas from "@/components/dashboard/PremiersPas";
import DemoDataBanner from "@/components/dashboard/DemoDataBanner";

/**
 * Tableau de bord — **poste de commandement** de l'établissement.
 *
 * ═══ LA QUESTION À LAQUELLE CET ÉCRAN RÉPOND ═══
 *
 * « Comment va mon école aujourd'hui, et qu'est-ce que je dois faire ? »
 * Pas « voici toutes les données de votre école ». Toute carte qui n'aide ni à
 * comprendre ni à agir appartient à **Rapports**, et y reste : cet écran ne fait
 * que pointer vers l'analyse détaillée, il ne la reproduit pas.
 *
 * ═══ LA HIÉRARCHIE, DE HAUT EN BAS ═══
 *
 *   1. Le brief du matin — la synthèse et les trois priorités
 *   2. À traiter — urgent / à surveiller / information
 *   3. Santé de l'école — cinq axes, un score s'il est calculable
 *   4. Aujourd'hui — la journée en cours
 *   5. Finance · Académique · Parents — résumés courts, liens vers Rapports
 *   6. Activité récente, et les factures **rétrogradées**
 *
 * ⚠️ **Les factures ne dominent plus.** Elles occupaient trois cinquièmes de
 * largeur en haut de page ; elles finissent l'écran en liste compacte. Rien n'a
 * été retiré — voir `RecentInvoices`.
 *
 * ═══ AUCUNE VALEUR N'EST INVENTÉE ═══
 *
 * Tout vient de `dashboardSnapshot()`, où chaque bloc est un `Signal` : une
 * valeur mesurée, ou une raison d'absence. Il n'existe aucun chemin de code
 * permettant d'afficher un chiffre qu'aucune requête n'a produit. Le lot 08
 * avait dû retirer quatre fictions de cet écran (objectif de 500 élèves, 98 % de
 * présence, tâches en dur, flux d'activité inventé) ; le type les rend
 * désormais impossibles à réintroduire par inadvertance.
 *
 * ⚠️ **Portée par rôle inchangée.** `hasAccess()` décide, dans le socle de
 * données, ce que chaque rôle voit — un enseignant ne lit pas la trésorerie.
 * Aucune permission n'est modifiée par cet écran.
 *
 * ⚠️ **Un seul `h1` par écran**, porté par le brief. `PageHeader` a donc disparu
 * d'ici : deux titres de page auraient rompu la règle du socle typographique.
 */
export default async function DashboardHome() {
  const { schoolId, school, user } = await requireSchoolContext();

  const snap = await dashboardSnapshot(
    { schoolId, userId: user.id, role: user.role },
    { firstName: user.firstName?.trim() || null, schoolName: school?.name ?? null },
  );

  // Tant qu'aucun élève n'existe, un mur de zéros n'apprend rien. Le panneau
  // s'efface DE LUI-MÊME au premier élève : il est piloté par une absence
  // réelle, jamais par un drapeau qu'il faudrait penser à baisser.
  const brandNew = snap.fresh.enrolled === 0 && snap.fresh.pending === 0;

  return (
    <div className="space-y-5 pb-12">
      {/* ── NIVEAU 1 — le brief ── */}
      <MorningBrief
        firstName={snap.firstName}
        schoolName={snap.schoolName}
        summary={snap.brief.summary}
        priorities={snap.brief.priorities}
        tone={snap.brief.tone}
        counts={snap.brief.counts}
      />

      {/* The activation engine stays visible until 100% activated */}
      {!snap.activation.isActivated && (
        <Reveal delay={0.08}>
          <PremiersPas
            schoolName={snap.schoolName ?? "Votre établissement"}
            classesCount={snap.fresh.classes}
            canAddStudent={snap.scope.students}
            activation={snap.activation}
          />
        </Reveal>
      )}

      {/* ── NIVEAU 2 — ce qui demande une action ──
          L'ancre sert la CTA « Voir les priorités » du brief. */}
      <div id="a-traiter" className="scroll-mt-6">
        <Reveal delay={0.12}>
          <AttentionCenter items={snap.attention} />
        </Reveal>
      </div>

      {snap.hasDemoData && (
        <DemoDataBanner />
      )}
      {/* ── NIVEAU 3 — santé de l'école ── */}
      <Reveal delay={0.18}>
        <SchoolHealth score={snap.health.score} axes={snap.health.axes} />
      </Reveal>

      {/* ── NIVEAU 4 — la journée en cours ── */}
      <Reveal delay={0.24}>
        <TodayPanel today={snap.today} />
      </Reveal>

      {/* ── NIVEAU 5 — trois résumés courts, chacun avec sa porte de sortie ──
          Sans accès à l'argent, la grille passe à deux colonnes plutôt que de
          laisser un trou : la mise en page suit le rôle, elle ne le trahit pas. */}
      {/* ⚠️ Bascule à `xl` (1280 px), pas à `lg` (1024 px). Mesuré au pilote
          Chrome : à 1024 px, trois colonnes écrasaient les libellés — « Taux de
          rec… », « Familles en r… » — et les mouvements académiques débordaient
          hors de leur carte. Deux colonnes à 1024, trois seulement au-delà. */}
      <div className={`grid grid-cols-1 gap-5 md:grid-cols-2 ${snap.scope.money ? "xl:grid-cols-3" : ""}`}>
        {snap.scope.money && (
          <Reveal delay={0.30} className="h-full"><FinanceSummary finance={snap.finance} /></Reveal>
        )}
        <Reveal delay={0.34} className="h-full"><AcademicSummary academic={snap.academic} /></Reveal>
        <Reveal delay={0.38} className="h-full"><ParentsSummary parents={snap.parents} /></Reveal>
      </div>

      {/* ── NIVEAU 6 — activité, et les factures en fin de page ── */}
      {/* Même raison : à 1024 px, deux colonnes tronquaient les intitulés de
          facture au tiers. Elles s'empilent jusqu'à 1280 px. */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Reveal delay={0.44}>
          <ActivityFeed events={snap.activity} />
        </Reveal>
        {snap.scope.money && (
          <Reveal delay={0.48}>
            <RecentInvoices invoices={snap.invoices} />
          </Reveal>
        )}
      </div>
    </div>
  );
}
