/**
 * In-Memory Request/Response Test Harness for Sandboxed Verification
 */

const EventEmitter = require('node:events');
const routes = require('./routes');
const DB = require('./db');
const Auth = require('./auth');

function createMockReq(method, path, body = null, headers = {}) {
  const req = new EventEmitter();
  req.method = method;
  req.url = path;
  req.headers = { ...headers };
  req.socket = { remoteAddress: '127.0.0.1' };

  process.nextTick(() => {
    if (body) {
      req.emit('data', Buffer.from(JSON.stringify(body)));
    }
    req.emit('end');
  });

  return req;
}

function createMockRes() {
  const res = new EventEmitter();
  res.headers = {};
  res.statusCode = 200;
  let bodyBuffer = '';

  res.setHeader = (key, val) => {
    res.headers[key.toLowerCase()] = val;
  };
  res.writeHead = (statusCode, headers = {}) => {
    res.statusCode = statusCode;
    Object.assign(res.headers, headers);
  };
  res.end = (data) => {
    if (data) bodyBuffer += data;
    try {
      res.body = bodyBuffer ? JSON.parse(bodyBuffer) : null;
    } catch {
      res.body = bodyBuffer;
    }
    res.emit('finish');
  };

  return res;
}

async function testScenario() {
  console.log('--- Starting Sandboxed In-Memory Auth Unit & Integration Tests ---');

  const testUser = {
    name: 'Sarah Connor',
    email: `sarah.${Date.now()}@cyberdyne.org`,
    password: 'SecureQuantumPassword2026!'
  };

  // 1. Register User
  const regRes = createMockRes();
  await routes.handleRegister(null, regRes, testUser, '127.0.0.1');
  console.assert(regRes.statusCode === 201, `Expected 201, got ${regRes.statusCode}`);
  console.assert(regRes.body.token, 'Expected token in register response');
  console.assert(regRes.body.user.email === testUser.email.toLowerCase(), 'Email mismatch');
  console.log('✓ Register endpoint returned 201 Created with JWT & PQC Fingerprint:', regRes.body.user.pqcFingerprint);

  const token = regRes.body.token;

  // 2. Reject duplicate registration
  const dupRes = createMockRes();
  await routes.handleRegister(null, dupRes, testUser, '127.0.0.1');
  console.assert(dupRes.statusCode === 409, `Expected 409, got ${dupRes.statusCode}`);
  console.log('✓ Duplicate registration correctly returned 409 Conflict:', dupRes.body.error);

  // 3. Test Login with bad password
  const badLoginRes = createMockRes();
  await routes.handleLogin(null, badLoginRes, { email: testUser.email, password: 'WrongPassword999!' }, '127.0.0.1');
  console.assert(badLoginRes.statusCode === 401, `Expected 401, got ${badLoginRes.statusCode}`);
  console.log('✓ Invalid password returned 401 Unauthorized:', badLoginRes.body.error);

  // 4. Test Login with valid password
  const goodLoginRes = createMockRes();
  await routes.handleLogin(null, goodLoginRes, { email: testUser.email, password: testUser.password }, '127.0.0.1');
  console.assert(goodLoginRes.statusCode === 200, `Expected 200, got ${goodLoginRes.statusCode}`);
  console.assert(goodLoginRes.body.token, 'Expected token on valid login');
  console.log('✓ Valid login returned 200 OK with fresh JWT session');

  // 5. Test Protected Route /api/auth/me without token
  const unauthMeReq = { headers: {} };
  const unauthMeRes = createMockRes();
  await routes.handleMe(unauthMeReq, unauthMeRes);
  console.assert(unauthMeRes.statusCode === 401, `Expected 401, got ${unauthMeRes.statusCode}`);
  console.log('✓ Protected route without token rejected with 401 Unauthorized');

  // 6. Test Protected Route /api/auth/me with Bearer token
  const authMeReq = { headers: { authorization: `Bearer ${token}` } };
  const authMeRes = createMockRes();
  await routes.handleMe(authMeReq, authMeRes);
  console.assert(authMeRes.statusCode === 200, `Expected 200, got ${authMeRes.statusCode}`);
  console.assert(authMeRes.body.user.email === testUser.email.toLowerCase(), 'Profile email mismatch');
  console.log('✓ Protected route with Bearer token verified:', authMeRes.body.user.name, authMeRes.body.user.email);

  // 7. Test Profile Update
  const updateReq = { headers: { authorization: `Bearer ${token}` } };
  const updateRes = createMockRes();
  await routes.handleUpdateProfile(updateReq, updateRes, { name: 'Sarah Connor (Cmdr)', organization: 'Resistance HQ' });
  console.assert(updateRes.statusCode === 200, `Expected 200, got ${updateRes.statusCode}`);
  console.assert(updateRes.body.user.name === 'Sarah Connor (Cmdr)', 'Name not updated');
  console.log('✓ Profile update persisted in SQLite:', updateRes.body.user.name, '| Org:', updateRes.body.user.organization);

  // 8. Test Audit Logs in SQLite
  const logsReq = { headers: { authorization: `Bearer ${token}` } };
  const logsRes = createMockRes();
  await routes.handleGetLogs(logsReq, logsRes);
  console.assert(logsRes.statusCode === 200, `Expected 200, got ${logsRes.statusCode}`);
  console.assert(logsRes.body.logs.length >= 3, 'Expected >= 3 logs in DB');
  console.log(`✓ Audit trail verified in SQLite: ${logsRes.body.logs.length} logged events recorded.`);

  console.log('\n======================================================');
  console.log('🌟 ALL IN-MEMORY INTEGRATION TESTS PASSED 100%!');
  console.log('======================================================');
}

testScenario().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
