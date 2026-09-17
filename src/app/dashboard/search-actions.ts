"use server";

import { prisma } from "@/lib/prisma";
import { requireActionContext } from "@/lib/actionContext";
import { hasAccess, type RoleType } from "@/lib/permissions";

export interface SearchResultItem {
  id: string;
  title: string;
  subtitle?: string;
  category: "student" | "class" | "staff" | "document" | "finance";
  categoryLabel: string;
  href: string;
}

/**
 * Recherche globale unifiée et multi-entités pour la TopBar Slack-style.
 * Respecte strictement le multi-tenant et la matrice des permissions du rôle.
 */
export async function globalSearchAction(query: string): Promise<{ items: SearchResultItem[] }> {
  const auth = await requireActionContext("/dashboard");
  if (!auth.ok) return { items: [] };

  const { schoolId, role, userId } = auth.ctx;
  const q = query?.trim().toLowerCase();
  if (!q || q.length < 2) return { items: [] };

  const userRole = role as RoleType;
  const results: SearchResultItem[] = [];

  // 1. ÉLÈVES (si l'utilisateur a accès aux élèves)
  if (hasAccess(userRole, "/dashboard/students")) {
    const studentWhere: any = {
      schoolId,
      OR: [
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { matricule: { contains: q, mode: "insensitive" } },
      ],
    };

    // Si parent, limiter strictement à ses enfants
    if (userRole === "PARENT") {
      studentWhere.parentId = userId;
    }

    const students = await prisma.student.findMany({
      where: studentWhere,
      take: 6,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        matricule: true,
        enrollments: {
          take: 1,
          select: {
            class: { select: { name: true } },
          },
        },
      },
    });

    for (const s of students) {
      const className = s.enrollments[0]?.class?.name;
      results.push({
        id: `student-${s.id}`,
        title: `${s.firstName} ${s.lastName}`,
        subtitle: [s.matricule, className].filter(Boolean).join(" · ") || "Élève",
        category: "student",
        categoryLabel: "Élève",
        href: `/dashboard/students/${s.id}`,
      });
    }
  }

  // 2. CLASSES (si l'utilisateur a accès aux classes)
  if (hasAccess(userRole, "/dashboard/classes")) {
    const classes = await prisma.class.findMany({
      where: {
        schoolId,
        name: { contains: q, mode: "insensitive" },
      },
      take: 4,
      select: {
        id: true,
        name: true,
        academicYear: true,
        cycle: true,
        _count: { select: { enrollments: true } },
      },
    });

    for (const c of classes) {
      results.push({
        id: `class-${c.id}`,
        title: c.name,
        subtitle: `${c.cycle || "Classe"} · ${c._count.enrollments} élève(s)`,
        category: "class",
        categoryLabel: "Classe",
        href: `/dashboard/classes/${c.id}`,
      });
    }
  }

  // 3. PERSONNEL / ENSEIGNANTS (si OWNER / ADMIN / SECRETARY)
  if (hasAccess(userRole, "/dashboard/team")) {
    const staff = await prisma.user.findMany({
      where: {
        schoolId,
        OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 4,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
      },
    });

    for (const m of staff) {
      results.push({
        id: `staff-${m.id}`,
        title: [m.firstName, m.lastName].filter(Boolean).join(" ") || m.email,
        subtitle: `Rôle : ${m.role} · ${m.email}`,
        category: "staff",
        categoryLabel: "Équipe",
        href: `/dashboard/team`,
      });
    }
  }

  // 4. DOCUMENTS & MODÈLES (si accès documents)
  const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const nq = normalize(q);

  if (hasAccess(userRole, "/dashboard/documents")) {
    const docKeywords = [
      { key: "certificat scolarite attestation", title: "Certificat de scolarité", href: "/dashboard/documents/certificate", label: "Documents" },
      { key: "bulletin notes report card", title: "Bulletins de notes", href: "/dashboard/grades/report-card", label: "Pédagogie" },
      { key: "fiche renseignement information urgence", title: "Fiche de renseignements", href: "/dashboard/documents/info-sheet", label: "Documents" },
      { key: "emploi du temps planning horaire", title: "Emplois du temps", href: "/dashboard/documents/timetable", label: "Documents" },
      { key: "relance rappel impaye facture", title: "Lettre de relance", href: "/dashboard/documents/reminder", label: "Documents" },
      { key: "modele gabarit en-tete mentions", title: "Modèles & Mentions légales", href: "/dashboard/documents/templates", label: "Documents" },
      { key: "bibliotheque archives documents produits", title: "Bibliothèque de documents", href: "/dashboard/documents", label: "Documents" },
      { key: "structure classes niveaux cycles", title: "Structure de l'école", href: "/dashboard/classes", label: "Scolarité" },
      { key: "admissions dossiers inscription", title: "Examen des admissions", href: "/dashboard/students/dossiers/review", label: "Scolarité" },
    ];

    for (const d of docKeywords) {
      if (normalize(d.key).includes(nq) || normalize(d.title).includes(nq)) {
        results.push({
          id: `doc-${d.title}`,
          title: d.title,
          subtitle: d.label,
          category: "document",
          categoryLabel: "Document",
          href: d.href,
        });
      }
    }
  }

  // 5. FINANCE (si accès payments)
  if (hasAccess(userRole, "/dashboard/payments")) {
    const finKeywords = [
      { key: "facture echeancier scolarite frais", title: "Factures & Échéanciers", href: "/dashboard/payments/invoice", label: "Finance" },
      { key: "recu versement paiement encaissement", title: "Reçus de paiement", href: "/dashboard/payments/receipt", label: "Finance" },
      { key: "tarif grille tarifaire prix", title: "Grille tarifaire", href: "/dashboard/payments/tarifs", label: "Finance" },
      { key: "depense achat sortie de caisse", title: "Dépenses & Achats", href: "/dashboard/payments/expenses", label: "Finance" },
      { key: "releve financier compte solde", title: "Relevé financier", href: "/dashboard/payments/statement", label: "Finance" },
    ];

    for (const f of finKeywords) {
      if (normalize(f.key).includes(nq) || normalize(f.title).includes(nq)) {
        results.push({
          id: `fin-${f.title}`,
          title: f.title,
          subtitle: f.label,
          category: "finance",
          categoryLabel: "Finance",
          href: f.href,
        });
      }
    }
  }

  return { items: results };
}
