const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { localDatabaseUrl, assertTestDatabase } = require('./test-database-safety.cjs');
const name = 'event_tracker_reliability_1793807881421_65917c1f';

test('accepts only local PostgreSQL targets', () => {
  for (const host of ['localhost', '127.0.0.1', '[::1]']) assert.equal(localDatabaseUrl(`postgresql://test:test@${host}:5432/app`).hostname, host);
  for (const value of [undefined, '', 'invalid', 'https://localhost/app', 'postgresql://test:test@remote.example/app', 'postgresql://test:test@localhost/app?host=remote.example']) {
    assert.throws(() => localDatabaseUrl(value));
  }
});
test('rejects application databases, missing/forged markers and mismatched names', () => {
  const env = { DATABASE_URL: `postgresql://test:test@localhost/${name}`, RELIABILITY_TEST_DB_NAME: name };
  assert.doesNotThrow(() => assertTestDatabase(env));
  for (const change of [
    { DATABASE_URL: 'postgresql://test:test@localhost/event_tracker' },
    { DATABASE_URL: `postgresql://test:test@remote.example/${name}` },
    { RELIABILITY_TEST_DB_NAME: '' }, { RELIABILITY_TEST_DB_NAME: 'event_tracker' },
    { RELIABILITY_TEST_DB_NAME: 'event_tracker_reliability_1_aaaaaaaa' },
  ]) assert.throws(() => assertTestDatabase({ ...env, ...change }));
});

test('the CLI refuses a hosted target before attempting migrations or tests', () => {
  const result = spawnSync(process.execPath, [path.join(__dirname, 'run-tests.cjs')], {
    encoding: 'utf8', timeout: 10000,
    env: { ...process.env, DATABASE_URL: 'postgresql://test:test@remote.example/app' },
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /hosted databases are refused/);
  assert.doesNotMatch(result.stdout, /Applying migration/);
});

test('direct Jest invocation rejects an application database before importing DB-writing suites', () => {
  const result = spawnSync(process.execPath, [require.resolve('jest/bin/jest'), '--runInBand', '--runTestsByPath', 'tests/auth.test.ts'], {
    cwd: path.resolve(__dirname, '..'), encoding: 'utf8', timeout: 20000,
    env: { ...process.env, DATABASE_URL: 'postgresql://test:test@localhost/event_tracker', RELIABILITY_TEST_DB_NAME: '' },
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Refusing to run Jest outside a disposable database/);
  assert.match(result.stderr, /Tests:\s+0 total/);
});
