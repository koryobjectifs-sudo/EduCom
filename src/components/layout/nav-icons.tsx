import React from "react";
import type { NavIconName } from "@/lib/navigation";
import {
  AppleDashboardIcon,
  AppleUsersIcon,
  AppleFolderKanbanIcon,
  AppleGraduationCapIcon,
  AppleWalletIcon,
  AppleSettingsIcon,
  AppleBarChartIcon,
  AppleClipboardListIcon,
  AppleClipboardCheckIcon,
  AppleFileTextIcon,
  AppleMessageIcon,
  AppleBookOpenIcon,
  AppleUserPlusIcon,
  AppleAlertTriangleIcon,
  AppleLayersIcon,
} from "@/components/ui/apple-icons";

export type NavIconComponent = React.ComponentType<{
  className?: string;
  size?: number;
  [key: string]: any;
}>;

export const NAV_ICONS: Record<NavIconName, NavIconComponent> = {
  LayoutDashboard: AppleDashboardIcon,
  Users: AppleUsersIcon,
  FolderKanban: AppleFolderKanbanIcon,
  GraduationCap: AppleGraduationCapIcon,
  CreditCard: AppleWalletIcon,
  Settings: AppleSettingsIcon,
  BarChart3: AppleBarChartIcon,
  ClipboardList: AppleClipboardListIcon,
  ClipboardCheck: AppleClipboardCheckIcon,
  FileText: AppleFileTextIcon,
  MessageSquare: AppleMessageIcon,
  BookOpen: AppleBookOpenIcon,
  UserCheck: AppleUserPlusIcon,
  AlertTriangle: AppleAlertTriangleIcon,
  Layers: AppleLayersIcon,
};

export function getNavIcon(name: NavIconName): NavIconComponent {
  return NAV_ICONS[name] ?? AppleDashboardIcon;
}
