import { prisma } from "./_env";
import { sessionCookies } from "./_cdp";

const BASE = "http://localhost:3000";

const ROUTES = [
  { path: "/dashboard", label: "/dashboard" },
  { path: "/dashboard/students", label: "/dashboard/students" },
  { path: "/dashboard/students?view=classes", label: "/dashboard/students?view=classes" },
  { path: "/dashboard/students/dossiers/review", label: "/dashboard/students/dossiers/review" },
  { path: "/dashboard/classes", label: "/dashboard/classes" },
  { path: "/dashboard/grades", label: "/dashboard/grades" },
  { path: "/dashboard/payments", label: "/dashboard/payments" },
];

async function measure() {
  console.log("=== MESURE DES PERFORMANCES SERVEUR & REQUÊTES SQL ===\n");

  // Authentification en tant que Directeur (OWNER) pour Saint Jean Paul Institut
  // Trouvons l'utilisateur OWNER de l'école réelle (1000 élèves)
  const school = await prisma.school.findFirst({
    where: { name: { contains: "SAINT JEAN PAUL" } },
    include: {
      users: { where: { role: "OWNER" }, take: 1 },
    },
  });

  if (!school || !school.users[0]) {
    console.error("École SAINT JEAN PAUL introuvable");
    process.exit(1);
  }

  const owner = school.users[0];
  console.log(`Établissement cible : ${school.name} (${school.id})`);
  console.log(`Utilisateur : ${owner.email} (${owner.role})`);

  // Préparation des cookies dev pour contourner Supabase Auth en mode direct ou via cookies de session
  const cookieHeader = `dev_test_school_id=${school.id}; dev_test_user_id=${owner.id}; educom_density=100`;

  const results: Array<{
    route: string;
    status: number;
    totalTimeMs: number;
    contentLength: number;
  }> = [];

  for (const r of ROUTES) {
    // Warmup
    try {
      await fetch(`${BASE}${r.path}`, {
        headers: { cookie: cookieHeader },
        redirect: "manual",
      });
    } catch {}

    // 3 passes de mesure pour moyenne
    const times: number[] = [];
    let lastStatus = 0;
    let lastLen = 0;

    for (let i = 0; i < 3; i++) {
      const start = performance.now();
      const res = await fetch(`${BASE}${r.path}`, {
        headers: { cookie: cookieHeader },
        redirect: "manual",
      });
      const text = await res.text();
      const duration = performance.now() - start;
      times.push(duration);
      lastStatus = res.status;
      lastLen = text.length;
    }

    const avgTime = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
    results.push({
      route: r.label,
      status: lastStatus,
      totalTimeMs: avgTime,
      contentLength: lastLen,
    });

    console.log(`Route : ${r.label.padEnd(40)} | Statut: ${lastStatus} | Durée serveur: ${avgTime}ms | Taille: ${lastLen} octets`);
  }

  console.log("\n=== SYNTHÈSE DES TEMPS DE RÉPONSE SERVEUR ===");
  console.table(results);
}

measure().catch(console.error);
