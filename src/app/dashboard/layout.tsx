import DashboardLayoutClient from "./DashboardLayoutClient";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { schoolThemeStyle } from "@/lib/theme";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // ⚠️ AUDIT DU 19 AOÛT 2026 — cette mise en page ne redirigeait PAS un
  // visiteur sans session : elle écrivait « DASHBOARD ACCESSED BY USER: NO
  // USER » dans le journal du serveur et rendait quand même la coquille du
  // tableau de bord, avec le rôle `PARENT` par défaut. Les écrans se
  // protégeaient chacun de leur côté, si bien que rien ne fuyait — mais la
  // barrière était absente là où on la croyait posée, et le moindre écran
  // oubliant son contrôle serait devenu public. La console de journalisation
  // partait avec : elle imprimait l'adresse e-mail de chaque utilisateur à
  // chaque navigation.
  if (!user) redirect("/login");

  let schoolName = "EduCom";
  let schoolLogo: string | null = null;
  let userRole = "PARENT"; // Default role fallback
  let primaryColor: string | null = null;
  let userName: string | undefined;

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { school: true },
  });

  // ⚠️ Un compte d'authentification SANS ligne applicative existait sans être
  // traité : l'écran s'affichait alors avec le rôle `PARENT` et le nom
  // « EduCom », c'est-à-dire un tableau de bord vide et incompréhensible. Le
  // cas est réel — il survient quand la création de l'espace échoue après
  // l'inscription (voir la transaction de `register/actions.ts`). On le nomme
  // au lieu de le laisser deviner.
  if (!dbUser || !dbUser.school) redirect("/login?erreur=espace_absent");

  userRole = dbUser.role;
  // Le profil affichait « Admin » en dur : le vrai nom vient d'ici.
  userName = [dbUser.firstName, dbUser.lastName].filter(Boolean).join(" ") || undefined;

  if (!dbUser.school.onboardingCompleted) {
    redirect("/onboarding");
  }
  schoolName = dbUser.school.name;
  schoolLogo = dbUser.school.logo;
  primaryColor = dbUser.school.primaryColor;

  // Injection du thème de l'établissement.
  //
  // `--color-primary` est surchargée ici, sur un conteneur qui englobe tout le
  // tableau de bord : la cascade CSS fait le reste, et les variantes (survol,
  // état actif, accent) sont dérivées de cette seule variable dans
  // `globals.css`. Aucune autre couleur n'est stockée ni transmise.
  //
  // `schoolThemeStyle` renvoie `undefined` quand l'école n'a pas de couleur
  // propre ou que la valeur en base n'est pas un hexadécimal valide : aucun
  // attribut `style` n'est alors émis et la charte EduCom par défaut
  // (`#0B1F3A`, définie dans `:root`) s'applique.
  const themeStyle = schoolThemeStyle(primaryColor);

  return (
    <div style={themeStyle} className="contents">
      <DashboardLayoutClient
        schoolName={schoolName}
        schoolLogo={schoolLogo}
        userRole={userRole}
        userName={userName}
      >
        {children}
      </DashboardLayoutClient>
    </div>
  );
}
