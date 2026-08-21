const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-only-secret';

const { verifyToken, requireRole } = require('../middleware/auth');

function mockResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
}

test('verifyToken accepts a valid Bearer token', () => {
  const token = jwt.sign({ id: 1, username: 'admin', role: 'admin' }, process.env.JWT_SECRET);
  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = mockResponse();
  let nextCalled = false;

  verifyToken(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(req.user.username, 'admin');
  assert.equal(res.statusCode, 200);
});

test('verifyToken rejects a missing token', () => {
  const req = { headers: {} };
  const res = mockResponse();
  let nextCalled = false;

  verifyToken(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.code, 'NO_TOKEN');
});

test('requireRole accepts matching roles case-insensitively', () => {
  const req = { user: { role: 'ADMIN' } };
  const res = mockResponse();
  let nextCalled = false;

  requireRole('admin')(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, 200);
});

test('requireRole rejects unauthorized roles', () => {
  const req = { user: { role: 'guru' } };
  const res = mockResponse();
  let nextCalled = false;

  requireRole('admin', 'operator')(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.code, 'INSUFFICIENT_ROLE');
});
