import { PrismaClient } from './src/generated/prisma'
import * as dotenv from 'dotenv'

dotenv.config()

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL,
    },
  },
})

async function main() {
  try {
    console.log('Renaming User.language to User.locale...');
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" RENAME COLUMN "language" TO "locale";`);
    console.log('Renamed User.language to User.locale.');
  } catch (err) {
    console.error('Error renaming User.language:', err.message);
  }

  try {
    console.log('Renaming School.documentLanguage to School.documentLocale...');
    await prisma.$executeRawUnsafe(`ALTER TABLE "School" RENAME COLUMN "documentLanguage" TO "documentLocale";`);
    console.log('Renamed School.documentLanguage to School.documentLocale.');
  } catch (err) {
    console.error('Error renaming School.documentLanguage:', err.message);
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
  })
