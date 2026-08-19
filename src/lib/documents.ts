import {
  FileText, ReceiptText, CalendarDays, Contact2, FileBadge, BellRing, Receipt,
  type LucideIcon,
} from "lucide-react";

/**
 * Catalogue des documents générables.
 *
 * ⚠️ **Deux générateurs étaient absents du hub** : `reminder` (lettre de
 * relance) et `receipt` (reçu de paiement). Tous deux fonctionnels, tous deux
 * corrigés au lot 00 — et `receipt` gère même des brouillons
 * (`draft_receipt_*`). Ils n'étaient atteignables qu'en tapant l'URL à la main.
 *
 * Le catalogue vit ici pour que la liste ne puisse plus diverger des
 * générateurs réellement présents : un contrôle de vérification compare cette
 * table au contenu de `src/app/dashboard/documents/`.
 */

export type DocumentKind = {
  id: string;
  /** Segment de route sous `/dashboard/documents/`. */
  slug: string;
  name: string;
  description: string;
  icon: LucideIcon;
  /**
   * Sur quoi porte le document. Sert à expliquer à l'utilisateur ce qu'il devra
   * sélectionner avant de générer.
   */
  subject: "élève" | "classe" | "facture";
  /** Documents les plus utilisés, mis en avant. */
  primary: boolean;
};

export const DOCUMENT_KINDS: DocumentKind[] = [
  {
    id: "report-card",
    slug: "report-card",
    name: "Bulletin de notes",
    description: "Bulletin trimestriel d'un élève, avec moyennes par matière et appréciations.",
    icon: FileText,
    subject: "élève",
    primary: true,
  },
  {
    id: "invoice",
    slug: "invoice",
    name: "Facture de scolarité",
    description: "Facture détaillée des frais, à remettre à la famille.",
    icon: ReceiptText,
    subject: "élève",
    primary: true,
  },
  {
    id: "receipt",
    slug: "receipt",
    name: "Reçu de paiement",
    description: "Justificatif d'un versement encaissé.",
    icon: Receipt,
    subject: "élève",
    primary: true,
  },
  {
    id: "certificate",
    slug: "certificate",
    name: "Certificat de scolarité",
    description: "Attestation officielle de scolarisation, signée par la direction.",
    icon: FileBadge,
    subject: "élève",
    primary: false,
  },
  {
    id: "reminder",
    slug: "reminder",
    name: "Lettre de relance",
    description: "Courrier de rappel pour une facture échue.",
    icon: BellRing,
    subject: "facture",
    primary: false,
  },
  {
    id: "info-sheet",
    slug: "info-sheet",
    name: "Fiche d'information",
    description: "Fiche de renseignements et données médicales d'un élève.",
    icon: Contact2,
    subject: "élève",
    primary: false,
  },
  {
    id: "timetable",
    slug: "timetable",
    name: "Emploi du temps",
    description: "Grille horaire hebdomadaire d'une classe.",
    icon: CalendarDays,
    subject: "classe",
    primary: false,
  },
];

export const documentHref = (d: DocumentKind) => `/dashboard/documents/${d.slug}`;
