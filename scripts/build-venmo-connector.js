// Build the Venmo connector from PayPal's official, pinned OpenAPI specs.
// Venmo has no public API of its own. This connector exposes only the PayPal
// Orders v2 and Payments v2 operations needed to take a Venmo payment as a
// PayPal merchant, and narrows the request schemas so the payment source can
// only be `venmo`. No private Venmo endpoints are used.
import fs from 'node:fs/promises';
import {isDeepStrictEqual} from 'node:util';
import {compileSpec, packCompiled, reachableDefs} from '../src/compiler.js';
import {normalizeSpec} from '../src/normalize.js';
const BASE = 'https://raw.githubusercontent.com/paypal/paypal-rest-api-specifications/90e8041ffe02d80c452d2b476bedd59a8d219bdc/openapi/';
const SOURCES = [
  {file: 'checkout_orders_v2.json', id: 'venmo'},
  {file: 'payments_payment_v2.json', id: 'venmo'},
];
// operationId -> [tool name suffix, venmo payment_source handling]
const PICK = {
  'orders.create': ['create_order', 'required'],
  'orders.get': ['get_order'],
  'orders.confirm': ['confirm_order_payment_source', 'required'],
  'orders.authorize': ['authorize_order', 'optional'],
  'orders.capture': ['capture_order', 'optional'],
  'authorizations.get': ['get_authorization'],
  'authorizations.capture': ['capture_authorization'],
  'authorizations.void': ['void_authorization'],
  'captures.get': ['get_capture'],
  'captures.refund': ['refund_capture'],
  'refunds.get': ['get_refund'],
};
const venmoOnly = {
  type: 'object', additionalProperties: false, required: ['venmo'],
  description: 'Venmo is the only payment source this connector accepts.',
  properties: {venmo: {$ref: '#/$defs/venmo_wallet_request'}},
};
const tools = []; const defs = {}; let schemes; let title = 'Venmo (via PayPal Checkout, official rails)';
for (const s of SOURCES) {
  const r = await fetch(BASE + s.file, {redirect: 'error', signal: AbortSignal.timeout(60000)});
  if (!r.ok) throw new Error(`Spec HTTP ${r.status}: ${s.file}`);
  const {doc} = await normalizeSpec(JSON.parse(await r.text()));
  const c = compileSpec(doc, {id: s.id, baseUrl: 'https://api-m.sandbox.paypal.com'});
  // Both specs name some shared schemas differently (e.g. payee_base). Keep each
  // spec's definitions in its own namespace so nothing is silently overwritten.
  const prefix = s.file.startsWith('payments') ? 'pay_' : '';
  for (const t of c.tools.filter(t => PICK[t.operationId])) {
    const text = JSON.stringify(t.inputSchema).replaceAll('"#/$defs/', `"#/$defs/${prefix}`);
    const schema = JSON.parse(text);
    schema.$defs = Object.fromEntries(Object.entries(schema.$defs).map(([k, v]) => [prefix + k, v]));
    // $defs keys prefixed; $ref strings inside defs were rewritten by the same replace.
    for (const [k, v] of Object.entries(schema.$defs)) {
      if (k in defs && !isDeepStrictEqual(defs[k], v)) throw new Error('Conflicting schema definition: ' + k);
      defs[k] = v;
    }
    t.inputSchema = schema;
  }
  schemes ||= c.securitySchemes;
  for (const t of c.tools) if (PICK[t.operationId]) tools.push(t);
}
if (tools.length !== Object.keys(PICK).length) throw new Error('Missing expected operations: ' + Object.keys(PICK).filter(k => !tools.some(t => t.operationId === k)));
for (const t of tools) {
  const [suffix, handling] = PICK[t.operationId];
  t.name = `venmo__${suffix}`; t.platform = 'venmo';
  if (t.security.some(r => Object.keys(r).some(k => !schemes[k]))) throw new Error('Unknown security scheme');
  if (handling) {
    const body = t.inputSchema.properties.body;
    body.properties = {...body.properties, payment_source: venmoOnly};
    if (handling === 'required') body.required = [...new Set([...(body.required || []), 'payment_source'])];
  }
  t.description = `[Venmo via PayPal Checkout] ${t.description}`.slice(0, 600);
  const {$defs, ...rest} = t.inputSchema;
  t.inputSchema = {...rest, $defs: reachableDefs(rest, defs)};
}
if (new Set(tools.map(t => t.name)).size !== tools.length) throw new Error('Duplicate tool names');
const out = packCompiled({id: 'venmo', title, version: 'orders-v2.32+payments-v2', baseUrl: 'https://api-m.sandbox.paypal.com', securitySchemes: schemes, tools, skipped: []});
await fs.mkdir('connectors', {recursive: true});
await fs.writeFile('connectors/venmo.json', JSON.stringify(out) + '\n');
console.log(tools.map(t => `${t.method} ${t.path} -> ${t.name}`).join('\n'));
