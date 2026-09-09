import {
  LayoutDashboard,
  Users,
  FolderKanban,
  GraduationCap,
  CreditCard,
  Settings,
  BarChart3,
  ClipboardList,
  FileText,
  MessageSquare,
  BookOpen,
  UserCheck,
  AlertTriangle,
  Layers,
  type LucideIcon,
} from "lucide-react";
import type { NavIconName } from "@/lib/navigation";

export const NAV_ICONS: Record<NavIconName, LucideIcon> = {
  LayoutDashboard,
  Users,
  FolderKanban,
  GraduationCap,
  CreditCard,
  Settings,
  BarChart3,
  ClipboardList,
  FileText,
  MessageSquare,
  BookOpen,
  UserCheck,
  AlertTriangle,
  Layers,
};

export function getNavIcon(name: NavIconName): LucideIcon {
  return NAV_ICONS[name] ?? LayoutDashboard;
}
