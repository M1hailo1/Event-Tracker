const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
const TEST_NAME = /^event_tracker_reliability_\d+_[a-f0-9]{8}$/;

function localDatabaseUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw Error('Configure a local PostgreSQL DATABASE_URL for tests.'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !LOCAL_HOSTS.has(url.hostname) || url.searchParams.has('host')) {
    throw Error('Tests require local PostgreSQL; hosted databases are refused.');
  }
  return url;
}

function assertTestDatabase(env = process.env) {
  const url = localDatabaseUrl(env.DATABASE_URL);
  if (!TEST_NAME.test(env.RELIABILITY_TEST_DB_NAME || '') || url.pathname !== `/${env.RELIABILITY_TEST_DB_NAME}`) {
    throw Error('Refusing to run Jest outside a disposable database. Use npm test or npm run test:reliability.');
  }
}

module.exports = { localDatabaseUrl, assertTestDatabase };
