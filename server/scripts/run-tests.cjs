const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');
const { localDatabaseUrl, assertTestDatabase } = require('./test-database-safety.cjs');
const cwd = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(cwd, '.env.test'), quiet: true });
dotenv.config({ path: path.join(cwd, '.env'), quiet: true });
const reliabilityTests = [
  'tests/eventReliability.integration.test.ts', 'tests/eventCancellation.integration.test.ts',
  'tests/pagination.integration.test.ts', 'tests/eventParticipationNotifications.integration.test.ts',
  'tests/savedEvents.integration.test.ts',
];
const scrub = value => String(value ?? '').replace(/postgres(?:ql)?:\/\/[^\s"']+/g, '[database URL hidden]');

async function main() {
  const baseUrl = localDatabaseUrl(process.env.DATABASE_URL);
  const databaseName = `event_tracker_reliability_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const admin = new PrismaClient({ datasources: { db: { url: baseUrl.toString() } } });
  const testUrl = new URL(baseUrl); testUrl.pathname = `/${databaseName}`;
  const env = {
    ...process.env, DATABASE_URL: testUrl.toString(), NODE_ENV: 'test', RELIABILITY_TEST_DB_NAME: databaseName,
    JWT_SECRET: crypto.randomBytes(32).toString('hex'), GOOGLE_CLIENT_ID: 'test-client.apps.googleusercontent.com',
  };
  assertTestDatabase(env);
  const args = process.argv.slice(2);
  const jestArgs = args[0] === '--reliability' ? ['--runTestsByPath', ...reliabilityTests, ...args.slice(1)] : args;
  function run(entry, args) {
    const result = spawnSync(process.execPath, [require.resolve(entry), ...args], { cwd, env, encoding: 'utf8', timeout: 120000 });
    process.stdout.write(scrub(result.stdout)); process.stderr.write(scrub(result.stderr));
    if (result.error) throw result.error;
    if (result.status !== 0) throw Error(`Test command failed (${result.status})`);
  }
  let created = false;
  try {
    await admin.$executeRawUnsafe(`CREATE DATABASE "${databaseName}"`); created = true;
    run('prisma/build/index.js', ['migrate', 'deploy']);
    run('jest/bin/jest', ['--runInBand', ...jestArgs]);
  } finally {
    try {
      if (created) { await admin.$executeRawUnsafe(`DROP DATABASE "${databaseName}"`); console.log('Removed disposable local test database.'); }
    } finally { await admin.$disconnect(); }
  }
}
main().catch(error => { console.error(scrub(error.message)); process.exitCode = 1; });
