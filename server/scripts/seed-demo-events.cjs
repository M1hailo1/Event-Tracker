// Explicit utility: never runs on startup, migration or deployment.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');
const templates = require('./demo-events.json');
const batch = 'demo-events-2026-11-03';
const disclaimer = 'DEMONSTRATION ONLY - NOT A REAL EVENT. No real gathering or booking is taking place. Map points are illustrative city locations, not actual venues.';
const cities = [
  ['Belgrade', 44.8, 20.46], ['Novi Sad', 45.25, 19.84], ['Nis', 43.32, 21.90],
  ['Kragujevac', 44.02, 20.92], ['Sombor', 45.78, 19.11], ['Cacak', 43.89, 20.35],
];
function idFor(key) {
  const bytes = crypto.createHash('sha256').update(`${batch}:${key}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
  const hex = bytes.toString('hex');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
const organizers = ['Creative Circle', 'Active Weekends', 'Learning Hub'].map((name, i) => ({
  id: idFor(`organizer-${i}`), name: `Demo Organizer - ${name}`, email: `eventtracker-demo-${i + 1}@example.test`,
}));
const start = new Date(); start.setUTCDate(start.getUTCDate() + 2); start.setUTCHours(12, 0, 0, 0);
const plan = templates.map((template, index) => {
  const date = new Date(start.getTime() + Math.floor(index * 1.5) * 86400000);
  date.setUTCHours(10 + (index % 4) * 2);
  const city = cities[index % cities.length];
  return {
    id: idFor(`event-${index + 1}`), name: `[DEMO] ${template.name}`,
    description: `${disclaimer}\n\n${template.summary}\n\nDemo data batch: ${batch}.`,
    date, endDate: new Date(date.getTime() + (1 + index % 3) * 3600000),
    location: `Demo venue (fictional), ${city[0]}`, latitude: city[1], longitude: city[2],
    categoryName: template.category, coverId: template.coverId,
    maxCapacity: [12, 20, 30, 50, 80][index % 5], createdByUserId: organizers[index % organizers.length].id,
  };
});
if (plan.length !== 36 || new Set(plan.map(item => item.id)).size !== 36) throw Error('Invalid demo plan');
if (process.argv.includes('--dry-run')) {
  console.log(JSON.stringify({ batch, organizers, events: plan }, null, 2));
} else if (process.argv.includes('--apply-neon')) {
  const envPath = path.resolve(__dirname, '../.env');
  const original = fs.readFileSync(envPath);
  const target = dotenv.parse(original).NEON_ONLINEDATA_URL;
  if (!target || !new URL(target).hostname.endsWith('.neon.tech')) throw Error('Configured Neon target required');
  const db = new PrismaClient({ datasourceUrl: target });
  const snapshot = async () => ({ users: await db.user.count(), events: await db.event.count(), registrations: await db.registration.count() });
  (async () => {
    try {
      console.log('Before:', JSON.stringify(await snapshot()));
      const result = await db.$transaction(async tx => {
        let createdUsers = 0, createdEvents = 0;
        for (const organizer of organizers) {
          const existing = await tx.user.findFirst({ where: { OR: [{ id: organizer.id }, { email: organizer.email }] } });
          if (existing) {
            if (existing.id !== organizer.id || existing.email !== organizer.email || existing.name !== organizer.name) throw Error('Demo account collision');
          } else { await tx.user.create({ data: organizer }); createdUsers++; }
        }
        const categories = await tx.category.findMany({ where: { isCustom: false } });
        const byName = new Map(categories.map(category => [category.name, category.id]));
        for (const item of plan) {
          const existing = await tx.event.findUnique({ where: { id: item.id } });
          if (existing) {
            if (existing.createdByUserId !== item.createdByUserId || !existing.description?.includes(`Demo data batch: ${batch}.`)) throw Error('Demo event collision');
            continue;
          }
          const categoryId = byName.get(item.categoryName);
          if (!categoryId) throw Error(`Missing curated category: ${item.categoryName}`);
          const { categoryName, ...data } = item;
          await tx.event.create({ data: {
            ...data, categoryId, categories: { connect: { id: categoryId } },
            visibility: 'PUBLIC', isRecurring: false,
            registrations: { create: { userId: item.createdByUserId, status: 'CONFIRMED', reminderSent: true, ratingPromptSent: true } },
          } });
          createdEvents++;
        }
        return { createdUsers, createdEvents };
      }, { maxWait: 10000, timeout: 90000 });
      const events = await db.event.findMany({ where: { id: { in: plan.map(item => item.id) } }, select: { id: true, name: true, date: true, endDate: true, createdByUserId: true, location: true } });
      const attendees = await db.registration.count({ where: { eventId: { in: plan.map(item => item.id) }, userId: { notIn: organizers.map(user => user.id) } } });
      if (events.length !== 36) throw Error('Demo verification failed');
      const manifest = { batch, disclaimer, organizers, events, note: 'Only normal organizer registrations were created; no fabricated attendees, ratings, comments, follows or notifications.' };
      const output = path.resolve(__dirname, '../../assets/demo-events', `${batch}.json`);
      fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, JSON.stringify(manifest, null, 2) + '\n');
      console.log('Applied:', JSON.stringify(result));
      console.log('After:', JSON.stringify(await snapshot()));
      console.log('Verified:', JSON.stringify({ demoEvents: events.length, nonOrganizerRegistrations: attendees }));
      if (!fs.readFileSync(envPath).equals(original)) throw Error('Saved environment changed unexpectedly');
      console.log('Saved .env unchanged. Demo manifest saved.');
    } finally { await db.$disconnect(); }
  })().catch(error => {
    console.error(String(error.message).replace(/postgres(?:ql)?:\/\/[^\s"']+/g, '[database URL hidden]').split(target).join('[database URL hidden]'));
    process.exitCode = 1;
  });
} else {
  console.error('Use --dry-run to review, or --apply-neon to explicitly create the demo batch.');
  process.exitCode = 1;
}
