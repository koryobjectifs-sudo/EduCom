import { prisma } from "../src/lib/prisma";
import { createAdminClient } from "../src/lib/supabase/admin";
import { sessionCookies } from "./_cdp";

const BASE = "http://localhost:3000";

async function run() {
  const admin = createAdminClient();
  const schoolId = "c5e484f1-2e4d-44f9-a403-f68e4f54bec8"; // SAINT JEAN PAUL INSTITUT (1000 élèves)
  const password = "Perf-Test-Password-2026!";
  const email = `perf-test-${Date.now()}@educom.sn`;

  const { data: auth, error: authErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (authErr || !auth.user) throw new Error(`Auth fail: ${authErr?.message}`);

  const user = await prisma.user.create({
    data: {
      id: auth.user.id,
      email,
      firstName: "Directeur",
      lastName: "Test",
      role: "OWNER",
      schoolId,
    },
  });

  try {
    const cookies = await sessionCookies(email, password);
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

    const routes = [
      { name: "/dashboard", url: "/dashboard" },
      { name: "/dashboard/students (2026-2027)", url: "/dashboard/students" },
      { name: "/dashboard/students (2025-2026 - 1000 élèves)", url: "/dashboard/students?annee=2025-2026" },
      { name: "/dashboard/students?view=classes", url: "/dashboard/students?view=classes" },
      { name: "/dashboard/students/dossiers/review", url: "/dashboard/students/dossiers/review" },
      { name: "/dashboard/classes", url: "/dashboard/classes" },
      { name: "/dashboard/grades", url: "/dashboard/grades" },
      { name: "/dashboard/payments", url: "/dashboard/payments" },
    ];

    console.log("=== MESURE DES TEMPS DE RENDU SERVEUR SSR (HTTP DEV) ===");
    const results = [];

    for (const r of routes) {
      // Warmup
      await fetch(`${BASE}${r.url}`, { headers: { cookie: cookieHeader } });

      // 3 runs average
      const times: number[] = [];
      for (let i = 0; i < 3; i++) {
        const start = performance.now();
        const res = await fetch(`${BASE}${r.url}`, { headers: { cookie: cookieHeader } });
        const text = await res.text();
        const duration = performance.now() - start;
        times.push(duration);
      }

      const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
      const min = Math.round(Math.min(...times));
      const max = Math.round(Math.max(...times));
      results.push({
        route: r.name,
        avgMs: avg,
        minMs: min,
        maxMs: max,
      });
      console.log(`✓ ${r.name.padEnd(45)} -> Avg: ${avg}ms (min: ${min}ms, max: ${max}ms)`);
    }

    console.table(results);
  } finally {
    await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
    await admin.auth.admin.deleteUser(user.id).catch(() => {});
  }
}

run().catch(console.error);
