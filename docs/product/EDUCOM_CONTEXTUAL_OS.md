# EDUCOM CONTEXTUAL OS
**Canonical Product Document**

## 1. Product Philosophy
EduCom is a **Contextual School Operating System**. It is not a static dashboard.
The product answers:
1. What period is this school currently in?
2. What matters during this period?
3. What requires attention?
4. What should this user do next?
5. What is the next meaningful WIN?

## 2. School Context & Calendar
The school calendar is the source of truth. We never hard-code months (e.g., September = admissions).
Two schools on the exact same date can be in completely different periods based on their own configured calendars.

## 3. Periods
The academic cycle is divided into configurable periods:
- **Admission / Registration**: Focus on new students, files, capacities.
- **Teaching**: Focus on daily school activity (daily attendance routines, missing students) and class management.
- **Assessment**: Focus on upcoming controls, missing work.
- **Grade Entry**: Focus on missing grades, teacher submissions.
- **Report Cards**: Focus on report generation, validation.
- **Re-registration**: Focus on returning students, deposits.
- **Vacation**: Focus on preparation, next year.

## 4. Context Engine
The central mechanism that resolves the current context:
`School -> AcademicYear -> Calendar -> Current Date -> Current Period -> Role -> Priorities -> Dashboard -> Next Best Action`

## 5. Dashboard & Next Best Action
The dashboard prioritizes:
1. CURRENT CONTEXT
2. RELEVANT KPIs
3. ATTENTION
4. NEXT BEST ACTION
5. ACTIVE WORKFLOWS
6. SUPPORTING INFORMATION

The **Next Best Action** is the most useful thing the user should do right now, determined by the Context Engine.
