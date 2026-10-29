import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {unpackCompiled} from '../src/compiler.js';
import {Engine} from '../src/engine.js';
const exec = promisify(execFile);
const awaitedFile = await fs.readFile(new URL('../connectors/venmo.json', import.meta.url), 'utf8');
const compiled = () => unpackCompiled(JSON.parse(awaitedFile));
const WRITES = ['venmo__create_order', 'venmo__confirm_order_payment_source', 'venmo__authorize_order', 'venmo__capture_order', 'venmo__capture_authorization', 'venmo__void_authorization', 'venmo__refund_capture'];
const READS = ['venmo__get_order', 'venmo__get_authorization', 'venmo__get_capture', 'venmo__get_refund'];
const TOKEN = 'A21AA-test-token-not-real';
// Local stand-in for PayPal's REST API. It checks the request shape only. It is not PayPal.
async function paypalStub(t) {
  const calls = [];
  const server = http.createServer(async (req, res) => {
    let body = ''; for await (const b of req) body += b;
    calls.push({method: req.method, url: req.url, headers: req.headers, body});
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/v1/oauth2/token') {
      const ok = req.headers.authorization === 'Basic ' + Buffer.from('cid:csecret').toString('base64') && body === 'grant_type=client_credentials';
      res.statusCode = ok ? 200 : 401;
      return res.end(JSON.stringify(ok ? {access_token: TOKEN, token_type: 'Bearer', expires_in: 32400} : {error: 'invalid_client', error_description: 'Client Authentication failed'}));
    }
    if (req.headers.authorization !== 'Bearer ' + TOKEN) { res.statusCode = 401; return res.end('{"name":"AUTHENTICATION_FAILURE"}'); }
    // Echo the token to prove the gateway redacts it.
    res.end(JSON.stringify({id: 'ORDER1', status: 'PAYER_ACTION_REQUIRED', echo: req.headers.authorization}));
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r)); t.after(() => server.close());
  return {calls, base: `http://127.0.0.1:${server.address().port}`};
}
const engineFor = (base, allow) => { process.env.PAYPAL_ACCESS_TOKEN = TOKEN; const c = compiled(); c.baseUrl = base; return new Engine([{compiled: c, allowLocalhost: true, auth: {Oauth2: {env: 'PAYPAL_ACCESS_TOKEN'}}, allowWriteOperations: allow}]); };
const order = {intent: 'CAPTURE', purchase_units: [{amount: {currency_code: 'USD', value: '5.00'}}], payment_source: {venmo: {experience_context: {brand_name: 'Test Shop', shipping_preference: 'NO_SHIPPING', user_action: 'PAY_NOW'}}}};

test('venmo connector exposes exactly the reviewed PayPal operations, sandbox by default', () => {
  const c = compiled();
  assert.deepEqual(c.tools.map(t => t.name).sort(), [...WRITES, ...READS].sort());
  assert.equal(c.baseUrl, 'https://api-m.sandbox.paypal.com');
  assert.deepEqual(c.skipped, []);
  for (const t of c.tools) assert.ok(t.path.startsWith('/v2/checkout/orders') || t.path.startsWith('/v2/payments/'), t.path);
});
test('only reads are enabled until payment operations are allowlisted', () => {
  const e = engineFor('https://api-m.sandbox.paypal.com', []);
  assert.deepEqual(e.list('', 'venmo').tools.map(t => t.name).sort(), READS.sort());
  assert.throws(() => e.describe('venmo__create_order'));
});
test('create order sends a Venmo payment source to PayPal Orders v2 with bearer auth, redacting the token', async t => {
  const {calls, base} = await paypalStub(t);
  const e = engineFor(base, WRITES);
  const r = await e.execute('venmo__create_order', {header: {'PayPal-Request-Id': 'req-1'}, body: order});
  assert.equal(r.status, 200); assert.equal(r.data.status, 'PAYER_ACTION_REQUIRED');
  assert.equal(r.data.echo, 'Bearer [REDACTED]');
  const c = calls[0];
  assert.equal(c.method, 'POST'); assert.equal(c.url, '/v2/checkout/orders');
  assert.equal(c.headers['content-type'], 'application/json'); assert.equal(c.headers['paypal-request-id'], 'req-1');
  assert.deepEqual(JSON.parse(c.body), order);
});
test('payment source must be Venmo: card, PayPal wallet and missing sources are rejected before any request', async t => {
  const {calls, base} = await paypalStub(t);
  const e = engineFor(base, WRITES);
  const bad = [
    {...order, payment_source: {card: {number: '4111111111111111'}}},
    {...order, payment_source: {paypal: {}}},
    {...order, payment_source: {venmo: {}, paypal: {}}},
    {intent: order.intent, purchase_units: order.purchase_units},
  ];
  for (const body of bad) await assert.rejects(() => e.execute('venmo__create_order', {body}), /do not match/);
  await assert.rejects(() => e.execute('venmo__confirm_order_payment_source', {path: {id: 'ORDER1'}, body: {payment_source: {card: {}}}}), /do not match/);
  assert.equal(calls.length, 0);
});
test('full Venmo lifecycle hits the documented PayPal paths and methods', async t => {
  const {calls, base} = await paypalStub(t);
  const e = engineFor(base, WRITES);
  await e.execute('venmo__create_order', {body: order});
  await e.execute('venmo__confirm_order_payment_source', {path: {id: 'O1'}, body: {payment_source: {venmo: {experience_context: {user_action: 'PAY_NOW'}}}}});
  await e.execute('venmo__get_order', {path: {id: 'O1'}});
  await e.execute('venmo__authorize_order', {path: {id: 'O1'}});
  await e.execute('venmo__capture_order', {path: {id: 'O1'}, header: {'PayPal-Request-Id': 'cap-1'}});
  await e.execute('venmo__get_authorization', {path: {authorization_id: 'A1'}});
  await e.execute('venmo__capture_authorization', {path: {authorization_id: 'A1'}, body: {amount: {currency_code: 'USD', value: '1.00'}, final_capture: true}});
  await e.execute('venmo__void_authorization', {path: {authorization_id: 'A1'}});
  await e.execute('venmo__get_capture', {path: {capture_id: 'C1'}});
  await e.execute('venmo__refund_capture', {path: {capture_id: 'C1'}, body: {amount: {currency_code: 'USD', value: '1.00'}, note_to_payer: 'refund'}});
  await e.execute('venmo__get_refund', {path: {refund_id: 'R1'}});
  assert.deepEqual(calls.map(c => `${c.method} ${c.url}`), [
    'POST /v2/checkout/orders', 'POST /v2/checkout/orders/O1/confirm-payment-source', 'GET /v2/checkout/orders/O1',
    'POST /v2/checkout/orders/O1/authorize', 'POST /v2/checkout/orders/O1/capture', 'GET /v2/payments/authorizations/A1',
    'POST /v2/payments/authorizations/A1/capture', 'POST /v2/payments/authorizations/A1/void', 'GET /v2/payments/captures/C1',
    'POST /v2/payments/captures/C1/refund', 'GET /v2/payments/refunds/R1']);
  assert.ok(calls.every(c => c.headers.authorization === 'Bearer ' + TOKEN));
  assert.equal(calls[4].headers['paypal-request-id'], 'cap-1');
});
test('a non-allowlisted payment operation stays blocked even when others are allowed', async t => {
  const {calls, base} = await paypalStub(t);
  const e = engineFor(base, ['venmo__create_order']);
  await assert.rejects(() => e.execute('venmo__refund_capture', {path: {capture_id: 'C1'}}), /disabled/);
  assert.equal(calls.length, 0);
});
test('paypal-token exchanges your client id/secret and prints only the token', async t => {
  const {calls, base} = await paypalStub(t);
  const run = env => exec(process.execPath, [path.resolve('src/cli.js'), 'paypal-token', '--base-url', base, '--allow-localhost'], {env: {...process.env, ...env}});
  const ok = await run({PAYPAL_CLIENT_ID: 'cid', PAYPAL_CLIENT_SECRET: 'csecret'});
  assert.equal(ok.stdout, TOKEN + '\n');
  await assert.rejects(() => run({PAYPAL_CLIENT_ID: 'cid', PAYPAL_CLIENT_SECRET: 'wrong'}), e => { assert.match(e.stderr, /HTTP 401 invalid_client/); assert.ok(!e.stderr.includes('wrong') && !e.stdout); return true; });
  await assert.rejects(() => run({PAYPAL_CLIENT_ID: '', PAYPAL_CLIENT_SECRET: ''}), /PAYPAL_CLIENT_ID/);
  assert.equal(calls.length, 2);
});
