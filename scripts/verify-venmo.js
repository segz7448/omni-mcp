// Live, credential-free probe of the real PayPal sandbox through the Venmo connector.
// It proves the connector reaches PayPal's real endpoints with correctly shaped requests
// and that PayPal rejects an invalid credential. It does NOT prove a Venmo payment:
// that needs your PayPal sandbox app credentials and a Venmo sandbox payer approval.
import fs from 'node:fs/promises';
import {unpackCompiled} from '../src/compiler.js';
import {Engine} from '../src/engine.js';
import {execFileSync} from 'node:child_process';
process.env.PAYPAL_ACCESS_TOKEN = 'invalid-token-for-probe';
const compiled = unpackCompiled(JSON.parse(await fs.readFile(new URL('../connectors/venmo.json', import.meta.url), 'utf8')));
const e = new Engine([{compiled, auth: {Oauth2: {env: 'PAYPAL_ACCESS_TOKEN'}}, allowWriteOperations: ['venmo__create_order']}]);
const body = {intent: 'CAPTURE', purchase_units: [{amount: {currency_code: 'USD', value: '1.00'}}], payment_source: {venmo: {experience_context: {user_action: 'PAY_NOW'}}}};
const out = {checkedAt: new Date().toISOString(), target: compiled.baseUrl, note: 'Unauthenticated probe only. No payment, order or token was created.', results: {}};
for (const [k, call] of Object.entries({
  create_order_invalid_token: ['venmo__create_order', {body}],
  get_order_invalid_token: ['venmo__get_order', {path: {id: 'NOTANORDER'}}],
})) { const r = await e.execute(...call); out.results[k] = {status: r.status, error: r.data?.name || r.data?.error}; }
try { execFileSync(process.execPath, ['src/cli.js', 'paypal-token'], {env: {...process.env, PAYPAL_CLIENT_ID: 'invalid-probe-id', PAYPAL_CLIENT_SECRET: 'invalid-probe-secret'}, stdio: 'pipe'}); out.results.paypal_token_invalid_client = {unexpected: 'succeeded'}; }
catch (err) { out.results.paypal_token_invalid_client = {message: String(err.stderr).trim()}; }
const expectOk = out.results.create_order_invalid_token.status === 401 && out.results.get_order_invalid_token.status === 401 && /HTTP 401/.test(out.results.paypal_token_invalid_client.message || '');
out.ok = expectOk;
await fs.writeFile('docs/venmo-verification.json', JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify(out, null, 2));
if (!expectOk) process.exitCode = 1;
