import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Mencoba koneksi ke database TBC...");
  const users = await prisma.user.findMany();
  console.log("Data User:", users);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });