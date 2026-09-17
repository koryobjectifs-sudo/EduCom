import { Client } from 'pg';
import { execSync } from 'child_process';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

async function main() {
  const directUrl = process.env.DIRECT_URL;
  if (!directUrl) throw new Error('DIRECT_URL is missing in environment');

  const schemaName = `blank_e2e_${Date.now()}`;
  console.log(`=== TEST DE DÉPLOIEMENT À BLANC SUR SCHEMA VIERGE : ${schemaName} ===`);

  const pgClient = new Client({ connectionString: directUrl });
  await pgClient.connect();

  try {
    // 1. Créer le schéma vierge
    console.log(`\n[1] Création du schéma vierge "${schemaName}"...`);
    await pgClient.query(`CREATE SCHEMA "${schemaName}"`);

    // 2. Exécuter prisma migrate deploy sur ce schéma
    console.log(`\n[2] Exécution de 'prisma migrate deploy' sur le schéma vierge...`);
    const testDirectUrl = `${directUrl}${directUrl.includes('?') ? '&' : '?'}schema=${schemaName}`;
    const testDbUrl = testDirectUrl;

    let deployOutput = "";
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        deployOutput = execSync('npx prisma migrate deploy', {
          env: {
            ...process.env,
            DATABASE_URL: testDbUrl,
            DIRECT_URL: testDirectUrl,
          },
          encoding: 'utf-8',
          stdio: 'pipe',
        });
        break;
      } catch (e: any) {
        console.warn(`Tentative ${attempt}/3 échouée (${e.message}). Nouvelle tentative dans 3s...`);
        if (attempt === 3) throw e;
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
    console.log(deployOutput);

    // 3. Vérifier prisma migrate status
    console.log(`\n[3] Vérification de 'prisma migrate status'...`);
    const statusOutput = execSync('npx prisma migrate status', {
      env: {
        ...process.env,
        DATABASE_URL: testDbUrl,
        DIRECT_URL: testDirectUrl,
      },
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    console.log(statusOutput);

    // 4. Parcours utilisateur complet via Prisma Client connecté au schéma
    console.log(`\n[4] Parcours complet : Inscription -> Onboarding -> Import Classe/Élèves -> Dashboard...`);
    
    // Configurer un client Prisma sur ce schéma
    const pool = new (require('pg').Pool)({
      connectionString: testDirectUrl,
      max: 2,
    });
    const adapter = new PrismaPg(pool, { schema: schemaName });
    const prisma = new PrismaClient({ adapter });

    // A. Inscription
    console.log(`- Création de l'établissement et de l'utilisateur Fondateur...`);
    const school = await prisma.school.create({
      data: {
        name: 'Complexe Scolaire Test Blanc',
        email: `direction_${Date.now()}@testblanc.educom.sn`,
        phone: '+221770000000',
        activeAcademicYear: '2026-2027',
        onboardingCompleted: false,
        schoolActivated: false,
        setupProgress: 1,
      },
    });

    const user = await prisma.user.create({
      data: {
        schoolId: school.id,
        email: `fondateur_${Date.now()}@testblanc.educom.sn`,
        firstName: 'Moussa',
        lastName: 'Faye',
        role: 'OWNER',
        emailVerified: true,
      },
    });
    console.log(`  ✓ École créée (ID: ${school.id}) et Utilisateur OWNER créé (ID: ${user.id})`);

    // B. Configuration Onboarding
    console.log(`- Finalisation de l'onboarding (Cycles, Année académique, Activation)...`);
    const updatedSchool = await prisma.school.update({
      where: { id: school.id },
      data: {
        onboardingCompleted: true,
        schoolActivated: true,
        setupProgress: 5,
        primaryColor: '#1B365D',
        regionAcademique: 'Dakar',
        inspectionAcademique: 'IA Dakar',
        inspectionIEF: 'IEF Almadies',
      },
    });
    console.log(`  ✓ Onboarding validé et école activée`);

    // C. Import d'une classe et élèves
    console.log(`- Création d'une classe (Terminale S2) et import d'élèves...`);
    const classe = await prisma.class.create({
      data: {
        schoolId: school.id,
        name: 'Terminale S2',
        cycle: 'SECONDAIRE',
        serie: 'S2',
        academicYear: '2026-2027',
      },
    });

    const student1 = await prisma.student.create({
      data: {
        schoolId: school.id,
        firstName: 'Amadou',
        lastName: 'Diallo',
        gender: 'M',
        dateOfBirth: new Date('2008-05-12'),
        matricule: 'MAT-2026-0001',
      },
    });

    const student2 = await prisma.student.create({
      data: {
        schoolId: school.id,
        firstName: 'Mariama',
        lastName: 'Ba',
        gender: 'F',
        dateOfBirth: new Date('2008-09-20'),
        matricule: 'MAT-2026-0002',
      },
    });

    await prisma.enrollment.createMany({
      data: [
        { studentId: student1.id, classId: classe.id, academicYear: '2026-2027' },
        { studentId: student2.id, classId: classe.id, academicYear: '2026-2027' },
      ],
    });
    console.log(`  ✓ Classe ${classe.name} créée et 2 élèves inscrits avec succès`);

    // D. Émission d'une facture séquentielle officielle
    console.log(`- Test d'émission d'une facture séquentielle officielle (modèle DocumentSequence)...`);
    const seq = await prisma.documentSequence.upsert({
      where: { schoolId_type_year: { schoolId: school.id, type: 'INVOICE', year: 2026 } },
      update: { lastNumber: { increment: 1 } },
      create: { schoolId: school.id, type: 'INVOICE', year: 2026, lastNumber: 1 },
    });
    const invNum = `FAC-2026-${String(seq.lastNumber).padStart(4, '0')}`;

    const invoice = await prisma.invoice.create({
      data: {
        schoolId: school.id,
        studentId: student1.id,
        invoiceNumber: invNum,
        title: 'Frais d inscription 2026-2027',
        totalAmount: 75000,
        dueDate: new Date('2026-10-31'),
        status: 'PENDING',
      },
    });
    console.log(`  ✓ Facture ${invoice.invoiceNumber} générée pour ${student1.firstName} ${student1.lastName}`);

    // E. Vérification du Dashboard / Métriques
    console.log(`- Vérification de l'état du tableau de bord...`);
    const studentCount = await prisma.student.count({ where: { schoolId: school.id } });
    const classCount = await prisma.class.count({ where: { schoolId: school.id } });
    const invoiceCount = await prisma.invoice.count({ where: { schoolId: school.id } });

    console.log(`  ✓ Métriques vérifiées : ${studentCount} élèves, ${classCount} classes, ${invoiceCount} facture`);
    if (studentCount !== 2 || classCount !== 1 || invoiceCount !== 1) {
      throw new Error('Incohérence des compteurs du tableau de bord');
    }

    await prisma.$disconnect();
    await pool.end();

    console.log('\n🎉 PARCOURS COMPLET SUR BASE VIERGE RÉUSSI SANS AUCUNE ERREUR !');
  } catch (err: any) {
    console.error('\n❌ ERREUR LORS DU TEST DE DÉPLOIEMENT À BLANC :');
    console.error(err);
    process.exitCode = 1;
  } finally {
    console.log(`\n[5] Nettoyage : Suppression du schéma temporaire "${schemaName}"...`);
    await pgClient.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
    await pgClient.end();
    console.log('✓ Schéma temporaire supprimé avec succès.');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
