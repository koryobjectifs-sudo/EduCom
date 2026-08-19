"use client";

import TopNav from "@/components/layout/TopNav";
import Sidebar from "@/components/layout/Sidebar";
import { usePathname, useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { useEffect } from "react";
import { hasAccess, firstAllowedPath, RoleType } from "@/lib/permissions";

export default function DashboardLayoutClient({
  children,
  schoolName,
  schoolLogo,
  userRole = "PARENT",
  userName,
}: {
  children: React.ReactNode;
  schoolName?: string;
  schoolLogo?: string | null;
  userRole?: string;
  userName?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pathname && !hasAccess(userRole as RoleType, pathname)) {
      // ⚠️ Redirection vers le premier chemin RÉELLEMENT autorisé, pas vers
      // `/dashboard` en dur. `PARENT` n'a pas accès à l'accueil : l'ancienne
      // version le renvoyait donc vers une page qu'il ne pouvait pas voir non
      // plus, et la redirection se relançait indéfiniment.
      router.push(firstAllowedPath(userRole as RoleType));
    }
  }, [pathname, userRole, router]);

  // If unauthorized for the current path, don't render children to avoid flickers or data leaks,
  // render null or a loading state while redirecting.
  // We can just render children because useEffect will redirect quickly, but for security:
  const isAuthorized = pathname ? hasAccess(userRole as RoleType, pathname) : true;

  return (
    <div className="flex min-h-screen w-full bg-ground print:bg-white">
      {/* La sidebar gère elle-même sa visibilité (masquée sous lg) : l'envelopper
          dans un conteneur `hidden md:flex` dupliquait la responsabilité et
          faisait apparaître le rail en tablette sans que la largeur suive. */}
      <Sidebar schoolName={schoolName} schoolLogo={schoolLogo} userRole={userRole} />
      <div className="flex min-w-0 flex-1 flex-col print:overflow-visible">
        <div className="print:hidden">
          <TopNav schoolName={schoolName} schoolLogo={schoolLogo} userRole={userRole} userName={userName} />
        </div>
        <main className="flex-1 w-full relative print:m-0 print:p-0">
          <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8 print:max-w-none print:p-0 print:m-0">
            {isAuthorized ? children : (
              <div className="flex h-[50vh] flex-col items-center justify-center text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-surface border border-rule bg-ground text-text-faint">
                  <Lock aria-hidden="true" className="h-6 w-6" />
                </div>
                <h2 className="text-role-section font-semibold text-text">Accès restreint</h2>
                <p className="mt-2 max-w-md text-role-body text-text-soft">
                  Vous n'avez pas les droits nécessaires pour cette page. Redirection en cours…
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
