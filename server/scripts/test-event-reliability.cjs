// Run database integration tests in a disposable LOCAL database, never Neon.
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');
dotenv.config({ path: path.resolve(__dirname, '../.env'), quiet: true });
const baseUrl = new URL(process.env.DATABASE_URL);
if (!['localhost', '127.0.0.1', '[::1]'].includes(baseUrl.hostname)) throw Error('Reliability tests require a local PostgreSQL connection');
const databaseName = `event_tracker_reliability_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
if (!/^event_tracker_reliability_\d+_[a-f0-9]{8}$/.test(databaseName)) throw Error('Invalid temporary database name');
const admin = new PrismaClient();
const testUrl = new URL(baseUrl); testUrl.pathname = `/${databaseName}`;
const env = { ...process.env, DATABASE_URL: testUrl.toString(), NODE_ENV: 'test', RELIABILITY_TEST_DB_NAME: databaseName };
function run(entry, args) {
  const result = spawnSync(process.execPath, [require.resolve(entry), ...args], { cwd: path.resolve(__dirname, '..'), env, encoding: 'utf8', timeout: 120000 });
  const scrub = text => String(text ?? '').replace(/postgres(?:ql)?:\/\/[^\s"']+/g, '[database URL hidden]');
  process.stdout.write(scrub(result.stdout)); process.stderr.write(scrub(result.stderr));
  if (result.error) throw result.error;
  if (result.status !== 0) throw Error(`Test command failed (${result.status})`);
}
(async () => {
  let created = false;
  try {
    await admin.$executeRawUnsafe(`CREATE DATABASE "${databaseName}"`); created = true;
    run('prisma/build/index.js', ['migrate', 'deploy']);
    run('jest/bin/jest', ['--runInBand', '--runTestsByPath', 'tests/eventReliability.integration.test.ts']);
  } finally {
    if (created) { await admin.$executeRawUnsafe(`DROP DATABASE "${databaseName}"`); console.log('Removed disposable local test database.'); }
    await admin.$disconnect();
  }
})().catch(error => { console.error(error.message.replace(/postgres(?:ql)?:\/\/[^\s"']+/g, '[database URL hidden]')); process.exitCode = 1; });
