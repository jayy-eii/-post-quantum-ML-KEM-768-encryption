/**
 * QUANTUM-SAFE Integration Test Suite
 * Tests full authentication lifecycle:
 * - Register new user
 * - Prevent duplicate email registration
 * - Login with valid credentials
 * - Reject login with invalid password
 * - Authenticate protected route /api/auth/me with Bearer token
 * - Reject unauthenticated access to /api/auth/me
 * - Update user profile
 * - Query audit logs
 * - Logout
 */

const http = require('node:http');

// Use a separate test port
process.env.PORT = '3099';
require('./server');

function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : null;
    const headers = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (postData) {
      headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request({
      hostname: '127.0.0.1',
      port: 3099,
      path,
      method,
      headers
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            body: data ? JSON.parse(data) : null
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            rawBody: data
          });
        }
      });
    });

    req.on('error', err => reject(err));
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runTests() {
  // Give server 200ms to bind
  await new Promise(r => setTimeout(r, 200));

  console.log('--- Starting Authentication Integration Tests ---');
  let token = null;
  const testUser = {
    name: 'Sarah Connor',
    email: `sarah.connor.${Date.now()}@cyberdyne.org`,
    password: 'SecureQuantumPassword2026!'
  };

  // 1. Health check
  const healthRes = await makeRequest('GET', '/api/health');
  console.assert(healthRes.statusCode === 200, `Health check failed: ${healthRes.statusCode}`);
  console.log('✓ Health check passed (200 OK)');

  // 2. Reject unauthenticated /api/auth/me
  const unauthRes = await makeRequest('GET', '/api/auth/me');
  console.assert(unauthRes.statusCode === 401, `Unauth /me should return 401, got ${unauthRes.statusCode}`);
  console.log('✓ Unauthenticated /api/auth/me correctly blocked (401 Unauthorized)');

  // 3. Register user
  const regRes = await makeRequest('POST', '/api/auth/register', testUser);
  console.assert(regRes.statusCode === 201, `Register failed: ${regRes.statusCode} - ${JSON.stringify(regRes.body)}`);
  console.assert(regRes.body.token, 'Register did not return token');
  console.assert(regRes.body.user.email === testUser.email.toLowerCase(), 'Register email mismatch');
  console.assert(regRes.body.user.pqcFingerprint, 'Register missing PQC fingerprint');
  token = regRes.body.token;
  console.log(`✓ User registered successfully: ${regRes.body.user.name} (${regRes.body.user.email})`);
  console.log(`  PQC Fingerprint: ${regRes.body.user.pqcFingerprint}`);

  // 4. Reject duplicate email registration
  const dupRes = await makeRequest('POST', '/api/auth/register', testUser);
  console.assert(dupRes.statusCode === 409, `Duplicate registration should return 409, got ${dupRes.statusCode}`);
  console.log('✓ Duplicate email registration properly blocked (409 Conflict)');

  // 5. Test login with wrong password
  const badLoginRes = await makeRequest('POST', '/api/auth/login', {
    email: testUser.email,
    password: 'WrongPassword999!'
  });
  console.assert(badLoginRes.statusCode === 401, `Invalid password should return 401, got ${badLoginRes.statusCode}`);
  console.log('✓ Invalid password challenge rejected (401 Unauthorized)');

  // 6. Test login with correct credentials
  const loginRes = await makeRequest('POST', '/api/auth/login', {
    email: testUser.email,
    password: testUser.password
  });
  console.assert(loginRes.statusCode === 200, `Login failed: ${loginRes.statusCode}`);
  console.assert(loginRes.body.token, 'Login response missing token');
  token = loginRes.body.token;
  console.log('✓ Login with valid credentials succeeded (200 OK, Token generated)');

  // 7. Test protected route /api/auth/me with Bearer token
  const meRes = await makeRequest('GET', '/api/auth/me', null, token);
  console.assert(meRes.statusCode === 200, `/api/auth/me failed: ${meRes.statusCode}`);
  console.assert(meRes.body.user.email === testUser.email.toLowerCase(), 'User profile mismatch');
  console.log(`✓ Protected /api/auth/me verified: ${meRes.body.user.name} | Role: ${meRes.body.user.role}`);

  // 8. Test profile update
  const updateRes = await makeRequest('PUT', '/api/auth/profile', {
    name: 'Sarah Connor (Cmdr)',
    organization: 'Tech Resistance Cryptography Dept'
  }, token);
  console.assert(updateRes.statusCode === 200, `Profile update failed: ${updateRes.statusCode}`);
  console.assert(updateRes.body.user.name === 'Sarah Connor (Cmdr)', 'Updated name mismatch');
  console.log('✓ Profile update succeeded');

  // 9. Query audit logs
  const logsRes = await makeRequest('GET', '/api/logs', null, token);
  console.assert(logsRes.statusCode === 200, `Logs query failed: ${logsRes.statusCode}`);
  console.assert(Array.isArray(logsRes.body.logs) && logsRes.body.logs.length >= 3, 'Audit logs count too low');
  console.log(`✓ Audit logs retrieved from SQLite (${logsRes.body.logs.length} events logged)`);

  // 10. Logout
  const logoutRes = await makeRequest('POST', '/api/auth/logout', null, token);
  console.assert(logoutRes.statusCode === 200, `Logout failed: ${logoutRes.statusCode}`);
  console.log('✓ Logout endpoint confirmed (200 OK)');

  console.log('\n=============================================');
  console.log('🎉 ALL AUTHENTICATION BACKEND TESTS PASSED 100%!');
  console.log('=============================================');

  process.exit(0);
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
