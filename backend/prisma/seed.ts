/**
 * Standalone seed script (run via `npm run db:seed` or `prisma migrate reset`).
 * Delegates to the same idempotent ensureSeedData() the server uses on boot.
 */
import { PrismaClient } from '@prisma/client';
import { ensureSeedData } from '../src/lib/seedData';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  await ensureSeedData(prisma);

  // A few historical telemetry rows so the History screen has something to show
  // on a fresh database (the simulator will append live data afterwards).
  const deviceId = process.env.DEMO_DEVICE_ID ?? 'demo-device-1';
  const existing = await prisma.telemetry.count({ where: { deviceId } });
  if (existing === 0) {
    const now = Date.now();
    const rows = Array.from({ length: 48 }).map((_, i) => {
      const minutesAgo = (48 - i) * 30;
      const t = new Date(now - minutesAgo * 60_000);
      const soil = 35 + Math.sin(i / 4) * 10 + Math.random() * 4;
      return {
        deviceId,
        soilMoisture: Number(soil.toFixed(1)),
        temperature: Number((24 + Math.sin(i / 6) * 4).toFixed(1)),
        humidity: Number((55 + Math.cos(i / 5) * 10).toFixed(1)),
        tankLevel: Number((80 - (i % 12) * 2).toFixed(1)),
        pumpStatus: i % 12 === 0,
        valveStatus: i % 12 === 0,
        emergencyStop: false,
        createdAt: t,
      };
    });
    await prisma.telemetry.createMany({ data: rows });
    console.log(`Seeded ${rows.length} historical telemetry rows.`);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
