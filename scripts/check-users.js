const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const total = await prisma.user.count();
  const byRole = await prisma.user.groupBy({
    by: ["role"],
    _count: { _all: true },
  });
  const users = await prisma.user.findMany({
    select: { moodleUserId: true, username: true, role: true },
    orderBy: { createdAt: "desc" },
  });

  console.log("Total users:", total);
  console.log("By role:", byRole.map((r) => `${r.role}=${r._count._all}`).join(", ") || "none");
  console.table(users);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
