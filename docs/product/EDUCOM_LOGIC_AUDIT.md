# EDUCOM LOGIC AUDIT

## 1. Dashboard (`src/lib/dashboard.ts` & `src/app/dashboard/page.tsx`)
- **Current Behavior**: The dashboard generates a static list of priorities (e.g., `pending > 0`, `orphanClasses > 0`) and always displays the same cards (Finance, Academic, Parents, Activity) regardless of the school's current period. The `attention` array pushes items based purely on static thresholds.
- **Classification**: ADAPT
- **Reason**: The dashboard must become dynamic. While the data fetching is robust (no fake data), the *presentation* and *prioritization* must adapt to the `CurrentPeriod` (e.g., Admission vs. Grade Entry).
- **Replacement**: Introduce `ContextEngine` to dictate what `attention` items are actually relevant right now, and to order the dashboard cards.
- **Migration Risk**: High. The dashboard is the command center. We must ensure we don't accidentally hide critical information (like a high overdue balance) just because it's not the "primary" period.

## 2. Pedagogy & Calendar (`src/lib/pedagogy.ts` & `src/lib/terms.ts`)
- **Current Behavior**: `schoolCalendar()` returns terms, upcoming evaluations, and whether a term is "current" or "fallback". `pickCurrentTerm()` decides the active term based on dates.
- **Classification**: ADAPT
- **Reason**: This is a great foundation, but it lacks the concept of *Periods* (Admission, Assessment, Report Cards). It currently only understands academic terms and evaluations.
- **Replacement**: Extend this logic into a full `ContextEngine` that can derive the `CurrentPeriod` from the calendar and the date.
- **Migration Risk**: Low. We are building on top of existing robust date logic.

## 3. Onboarding (`src/app/onboarding`)
- **Current Behavior**: Standard wizard flow to set up the school.
- **Classification**: KEEP / ADAPT
- **Reason**: We need to add the ability to set the basic academic year and calendar periods during onboarding, but without adding friction.
- **Replacement**: Update the configuration step to include basic period setup with smart defaults.
- **Migration Risk**: Medium.

## 4. Notifications & Tasks
- **Current Behavior**: Handled entirely through the `attention` array in `dashboard.ts`.
- **Classification**: ADAPT
- **Reason**: Alerts like "upcoming composition in 21 days" are hardcoded.
- **Replacement**: The `ContextEngine` will provide "Priority Signals" which the dashboard will use to formulate the "Next Best Action".
- **Migration Risk**: Low.
