import { Client } from 'pg';
import { execSync } from 'child_process';
import fs from 'fs';

// Simple manual .env parser
const envFile = fs.readFileSync('.env', 'utf-8');
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    let val = match[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    process.env[key] = val;
  }
});

const directUrl = process.env.DIRECT_URL;
if (!directUrl) throw new Error('DIRECT_URL is missing');

const schemaName = `blank_test_${Date.now()}`;
const testDirectUrl = `${directUrl}&schema=${schemaName}`;

// DATABASE_URL in .env has pgbouncer=true which might fail for migrations? Actually Prisma needs DIRECT_URL for migrations.
// We will just replace DIRECT_URL and DATABASE_URL for the child process.
const dbUrl = process.env.DATABASE_URL;
const testDbUrl = `${dbUrl}&schema=${schemaName}`;

async function run() {
  const client = new Client({ connectionString: directUrl });
  await client.connect();

  console.log(`\n=== 1. CREATING BLANK SCHEMA: ${schemaName} ===`);
  await client.query(`CREATE SCHEMA "${schemaName}"`);
  
  try {
    console.log(`\n=== 2. RUNNING MIGRATIONS ON BLANK SCHEMA ===`);
    const env = { 
      ...process.env, 
      DATABASE_URL: testDbUrl, 
      DIRECT_URL: testDirectUrl 
    };
    
    // We must temporarily rename .env so Prisma CLI doesn't read it and override our env vars.
    fs.renameSync('.env', '.env.temp');
    
    try {
      const output = execSync('npx prisma migrate deploy', { env, encoding: 'utf-8', stdio: 'pipe' });
      console.log(output);
    } finally {
      // Always restore .env
      fs.renameSync('.env.temp', '.env');
    }

    console.log(`\n=== 3. VERIFYING MIGRATION STATUS ===`);
    fs.renameSync('.env', '.env.temp');
    try {
      const statusOutput = execSync('npx prisma migrate status', { env, encoding: 'utf-8', stdio: 'pipe' });
      console.log(statusOutput);
    } finally {
      fs.renameSync('.env.temp', '.env');
    }

    console.log(`\n=== 4. VERIFYING DATABASE STATE ===`);
    
    // Check EducationalCycle values
    const enumRes = await client.query(`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (
        SELECT oid FROM pg_type WHERE typname = 'EducationalCycle' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = $1)
      )
    `, [schemaName]);
    
    console.log('EducationalCycle values in new schema:', enumRes.rows.map(r => r.enumlabel).join(', '));
    
    // Check User.locale
    const userRes = await client.query(`
      SELECT column_name, column_default 
      FROM information_schema.columns 
      WHERE table_schema = $1 AND table_name = 'User' AND column_name = 'locale'
    `, [schemaName]);
    
    console.log('User.locale column:', userRes.rows.length > 0 ? 'EXISTS' : 'MISSING', userRes.rows[0]);

    // Check School.documentLocale
    const schoolRes = await client.query(`
      SELECT column_name, column_default 
      FROM information_schema.columns 
      WHERE table_schema = $1 AND table_name = 'School' AND column_name = 'documentLocale'
    `, [schemaName]);
    
    console.log('School.documentLocale column:', schoolRes.rows.length > 0 ? 'EXISTS' : 'MISSING', schoolRes.rows[0]);

    // Check Class.academicYear
    const classRes = await client.query(`
      SELECT column_name, column_default, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = $1 AND table_name = 'Class' AND column_name = 'academicYear'
    `, [schemaName]);
    
    console.log('Class.academicYear column:', classRes.rows.length > 0 ? 'EXISTS' : 'MISSING', classRes.rows[0]);

  } catch (error: any) {
    console.error('\n❌ ERROR:');
    console.error(error.message);
    if (error.stdout) console.error('STDOUT:', error.stdout);
    if (error.stderr) console.error('STDERR:', error.stderr);
  } finally {
    console.log(`\n=== 5. CLEANING UP SCHEMA ===`);
    await client.query(`DROP SCHEMA "${schemaName}" CASCADE`);
    await client.end();
  }
}

run();
