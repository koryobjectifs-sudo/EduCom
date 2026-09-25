import React from "react";

interface IconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number;
}

/**
 * Jeu d'icônes géométriques inspiré du système Apple SF Symbols (Apple HIG).
 * Tracés monoline précis, angles harmonieux, identité professionnelle et institutionnelle.
 * Conçu pour éliminer le look "vibe codé / IA / templates génériques".
 */

// Apple SF Symbol: building.columns (Établissement / École / Institution)
export function AppleSchoolIcon({ className = "h-5 w-5", size, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width={size} height={size} className={className} {...props}>
      <path d="M3 21h18" />
      <path d="M5 21v-7.5" />
      <path d="M9.5 21v-7.5" />
      <path d="M14.5 21v-7.5" />
      <path d="M19 21v-7.5" />
      <path d="M3.5 13.5h17" />
      <path d="M12 3.5 3 8v2h18V8l-9-4.5Z" />
    </svg>
  );
}

// Apple SF Symbol: arrow.down.doc (Importation de fichier / Tableur / Annuaire)
export function AppleImportDocIcon({ className = "h-5 w-5", size, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width={size} height={size} className={className} {...props}>
      <path d="M14 3v4.5a1 1 0 0 0 1 1h4.5" />
      <path d="M17.5 21H6.5A2.5 2.5 0 0 1 4 18.5V5.5A2.5 2.5 0 0 1 6.5 3H14l5.5 5.5v10A2.5 2.5 0 0 1 17 21Z" />
      <path d="M12 11.5v6" />
      <path d="m9.5 15 2.5 2.5 2.5-2.5" />
    </svg>
  );
}

// Apple SF Symbol: arrow.triangle.2.circlepath (Automatisation / Flux continu / Synchronisation)
export function AppleAutoSyncIcon({ className = "h-5 w-5", size, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width={size} height={size} className={className} {...props}>
      <path d="M21 12a9 9 0 0 0-15.35-6.36L3.5 7.8" />
      <path d="M3.5 3.5v4.5H8" />
      <path d="M3 12a9 9 0 0 0 15.35 6.36l2.15-2.16" />
      <path d="M20.5 20.5V16H16" />
    </svg>
  );
}

// Apple SF Symbol: checkmark (Validation douce et nette)
export function AppleCheckIcon({ className = "h-3.5 w-3.5", size, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width={size} height={size} className={className} {...props}>
      <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
    </svg>
  );
}

// Apple SF Symbol: arrow.right (Action et navigation)
export function AppleArrowRightIcon({ className = "h-4 w-4", size, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={size} height={size} className={className} {...props}>
      <path d="M3 8h10" />
      <path d="m9 4 4 4-4 4" />
    </svg>
  );
}

// Apple SF Symbol: checkmark.shield (Protection des données et parité)
export function AppleShieldCheckIcon({ className = "h-4 w-4", size, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width={size} height={size} className={className} {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

// Apple SF Symbol: graduationcap (Bulletins officiels & Pédagogie)
export function AppleGraduationCapIcon({ className = "h-5 w-5", size, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width={size} height={size} className={className} {...props}>
      <path d="M22 10v6" />
      <path d="M12 4 2 9l10 5 10-5-10-5Z" />
      <path d="M6 11.5v5c0 2 2.7 3.5 6 3.5s6-1.5 6-3.5v-5" />
    </svg>
  );
}

// Apple SF Symbol: doc.text (Documents, Bulletins et Attestations)
export function AppleFileTextIcon({ className = "h-5 w-5", size, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width={size} height={size} className={className} {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
      <path d="M10 9H8" />
    </svg>
  );
}

// Apple SF Symbol: banknote / receipt (Facturation, Reçus et Caisse)
export function AppleReceiptIcon({ className = "h-5 w-5", size, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width={size} height={size} className={className} {...props}>
      <rect width="20" height="14" x="2" y="5" rx="2.5" />
      <line x1="2" x2="22" y1="10" y2="10" />
      <path d="M6 15h2" />
      <path d="M14 15h4" />
    </svg>
  );
}

// Apple SF Symbol: calendar.badge.checkmark (Présences et pointage journalier)
export function AppleCalendarCheckIcon({ className = "h-5 w-5", size, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width={size} height={size} className={className} {...props}>
      <rect width="18" height="18" x="3" y="4" rx="2.5" />
      <path d="M16 2v4" />
      <path d="M8 2v4" />
      <path d="M3 10h18" />
      <path d="m9 16 2 2 4-4" />
    </svg>
  );
}

// Apple SF Symbol: person.2 (Effectif & Annuaire des élèves)
export function AppleUsersIcon({ className = "h-5 w-5", size, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width={size} height={size} className={className} {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

// Apple SF Symbol: person.badge.plus (Nouvelle inscription / Admission)
export function AppleUserPlusIcon({ className = "h-5 w-5", size, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width={size} height={size} className={className} {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" x2="20" y1="8" y2="14" />
      <line x1="23" x2="17" y1="11" y2="11" />
    </svg>
  );
}

// Apple SF Symbol: folder.badge.checkmark (Dossiers élèves complets)
export function AppleFolderCheckIcon({ className = "h-5 w-5", size, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width={size} height={size} className={className} {...props}>
      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
      <path d="m9 13 2 2 4-4" />
    </svg>
  );
}

// Apple SF Symbol: creditcard / wallet (Recouvrement)
export function AppleWalletIcon({ className = "h-5 w-5", size, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width={size} height={size} className={className} {...props}>
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <line x1="2" x2="22" y1="10" y2="10" />
    </svg>
  );
}

// Apple SF Symbol: phone (Liaison WhatsApp & Familles)
export function ApplePhoneIcon({ className = "h-5 w-5", size, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width={size} height={size} className={className} {...props}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

// Apple SF Symbol: exclamationmark.triangle (Alertes & Arbitrages urgents)
export function AppleAlertTriangleIcon({ className = "h-5 w-5", size, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width={size} height={size} className={className} {...props}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" x2="12" y1="9" y2="13" />
      <line x1="12" x2="12.01" y1="17" y2="17" />
    </svg>
  );
}

// Apple SF Symbol: chevron.down (Menus déroulants)
export function AppleChevronDownIcon({ className = "h-3.5 w-3.5", size, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={size} height={size} className={className} {...props}>
      <path d="m4 6 4 4 4-4" />
    </svg>
  );
}

// Apple SF Symbol: line.3.horizontal (Menu mobile)
export function AppleMenuIcon({ className = "h-5 w-5", size, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={size} height={size} className={className} {...props}>
      <line x1="4" x2="20" y1="6" y2="6" />
      <line x1="4" x2="20" y1="12" y2="12" />
      <line x1="4" x2="20" y1="18" y2="18" />
    </svg>
  );
}

// Apple SF Symbol: xmark (Fermeture)
export function AppleXIcon({ className = "h-5 w-5", size, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={size} height={size} className={className} {...props}>
      <line x1="18" x2="6" y1="6" y2="18" />
      <line x1="6" x2="18" y1="6" y2="18" />
    </svg>
  );
}

// Apple SF Symbol: iphone (Gabarit téléphone mobile Slack-style)
export function AppleDevicePhoneIcon({ className = "h-6 w-6", size, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width={size} height={size} className={className} {...props}>
      <rect width="14" height="20" x="5" y="2" rx="3" />
      <path d="M12 18h.01" />
    </svg>
  );
}

// Badge "Vos choix de confidentialité" (format officiel standard / Slack-style)
export function ApplePrivacyChoicesBadge({ className = "h-3.5 w-7", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 30 14" fill="none" className={className} {...props}>
      <rect width="30" height="14" rx="7" fill="#0066CC" />
      <path d="m7 7 2 2 3-4" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m19 5 4 4m0-4-4 4" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="21" cy="7" r="5" fill="#FFFFFF" />
      <path d="m19 5 4 4m0-4-4 4" stroke="#0066CC" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Apple SF Symbol: magnifyingglass (Recherche rapide)
export function AppleSearchIcon({ className = "h-4 w-4", size, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width={size} height={size} className={className} {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

// Apple SF Symbol: message (Messagerie / WhatsApp)
export function AppleMessageIcon({ className = "h-5 w-5", size, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width={size} height={size} className={className} {...props}>
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
    </svg>
  );
}

// Apple SF Symbol: calculator (Calcul des moyennes & arithmétique)
export function AppleCalculatorIcon({ className = "h-5 w-5", size, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width={size} height={size} className={className} {...props}>
      <rect width="16" height="20" x="4" y="2" rx="3" />
      <line x1="8" x2="16" y1="6" y2="6" />
      <line x1="16" x2="16" y1="14" y2="18" />
      <path d="M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M8 18h.01M12 18h.01" strokeWidth="2.5" />
    </svg>
  );
}

// Apple SF Symbol: book.closed / notebook (Cahier d'appel & Registre papier)
export function AppleNotebookIcon({ className = "h-5 w-5", size, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width={size} height={size} className={className} {...props}>
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
      <path d="M6 2v20" />
      <path d="M10 7h6" />
      <path d="M10 11h6" />
    </svg>
  );
}

// Apple SF Symbol: square.grid.2x2 (Tableau de bord / Accueil)
export function AppleDashboardIcon({ className = "h-5 w-5", size, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width={size} height={size} className={className} {...props}>
      <rect width="7.5" height="7.5" x="3.5" y="3.5" rx="2" />
      <rect width="7.5" height="7.5" x="13" y="3.5" rx="2" />
      <rect width="7.5" height="7.5" x="3.5" y="13" rx="2" />
      <rect width="7.5" height="7.5" x="13" y="13" rx="2" />
    </svg>
  );
}

// Apple SF Symbol: gearshape (Configuration & Paramètres)
export function AppleSettingsIcon({ className = "h-5 w-5", size, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width={size} height={size} className={className} {...props}>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

// Apple SF Symbol: chart.bar.xaxis (Rapports & Statistiques)
export function AppleBarChartIcon({ className = "h-5 w-5", size, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width={size} height={size} className={className} {...props}>
      <line x1="12" x2="12" y1="20" y2="10" />
      <line x1="18" x2="18" y1="20" y2="4" />
      <line x1="6" x2="6" y1="20" y2="14" />
      <line x1="3" x2="21" y1="20" y2="20" />
    </svg>
  );
}

// Apple SF Symbol: list.bullet.clipboard (Registres & Listes)
export function AppleClipboardListIcon({ className = "h-5 w-5", size, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width={size} height={size} className={className} {...props}>
      <rect width="16" height="18" x="4" y="4" rx="2.5" />
      <path d="M8 4V2.5A1.5 1.5 0 0 1 9.5 1h5A1.5 1.5 0 0 1 16 2.5V4" />
      <line x1="9" x2="15" y1="9" y2="9" />
      <line x1="9" x2="15" y1="13" y2="13" />
      <line x1="9" x2="13" y1="17" y2="17" />
    </svg>
  );
}

// Apple SF Symbol: checklist (Pointages & Validations)
export function AppleClipboardCheckIcon({ className = "h-5 w-5", size, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width={size} height={size} className={className} {...props}>
      <rect width="16" height="18" x="4" y="4" rx="2.5" />
      <path d="M8 4V2.5A1.5 1.5 0 0 1 9.5 1h5A1.5 1.5 0 0 1 16 2.5V4" />
      <path d="m9 13.5 2 2 4-4" />
    </svg>
  );
}

// Apple SF Symbol: book.pages (Pédagogie & Programmes)
export function AppleBookOpenIcon({ className = "h-5 w-5", size, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width={size} height={size} className={className} {...props}>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

// Apple SF Symbol: square.stack.3d.up (Structure & Cycles)
export function AppleLayersIcon({ className = "h-5 w-5", size, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width={size} height={size} className={className} {...props}>
      <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
      <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
      <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
    </svg>
  );
}

// Apple SF Symbol: folder.badge.gearshape (Dossiers & Organisation)
export function AppleFolderKanbanIcon({ className = "h-5 w-5", size, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width={size} height={size} className={className} {...props}>
      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
      <path d="M8 10v4" />
      <path d="M12 10v2" />
      <path d="M16 10v6" />
    </svg>
  );
}

// Apple SF Symbol: globe (Site Web / Portail)
export function AppleGlobeIcon({ className = "h-5 w-5", size, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width={size} height={size} className={className} {...props}>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" x2="22" y1="12" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

// Apple SF Symbol: clock (Horodatage et retards)
export function AppleClockIcon({ className = "h-4 w-4", size, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width={size} height={size} className={className} {...props}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

// Apple SF Symbol: wifi (Indicateur réseau iOS)
export function AppleWifiIcon({ className = "h-3.5 w-3.5", size, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={size} height={size} className={className} {...props}>
      <path d="M12 20h.01" />
      <path d="M8.5 16.5a5 5 0 0 1 7 0" />
      <path d="M5 12.5a10 10 0 0 1 14 0" />
      <path d="M1.5 8.5a15 15 0 0 1 21 0" />
    </svg>
  );
}
