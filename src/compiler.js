import { createHash } from 'node:crypto';
const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];
export const safeName = s => String(s).replace(/[^a-zA-Z0-9_-]/g, '_');
export function resolve(doc, value) {
  const seen = new Set();
  while (value?.$ref) {
    const ref = value.$ref;
    if (!ref.startsWith('#/')) throw new Error('External references must be bundled before import');
    if (seen.has(ref)) throw new Error('Reference cycle outside schema');
    seen.add(ref);
    value = ref.slice(2).split('/').reduce((o, k) => o?.[k.replace(/~1/g, '/').replace(/~0/g, '~')], doc);
    if (!value) throw new Error('Unresolved reference');
  }
  return value;
}
function schema(v) {
  if (Array.isArray(v)) return v.map(schema);
  if (!v || typeof v !== 'object') return v;
  const out = {};
  for (const [k, x] of Object.entries(v)) {
    if (['example', 'xml', 'discriminator', 'nullable'].includes(k) || k.startsWith('x-')) continue;
    if (k === '$ref') {
      if (!x.startsWith('#/components/schemas/')) throw new Error('Only bundled component schema references are supported');
      out[k] = x.replace('#/components/schemas/', '#/$defs/');
    } else if (k === 'exclusiveMinimum' && typeof x === 'boolean') {
      if (x && typeof v.minimum === 'number') out[k] = v.minimum;
    } else if (k === 'exclusiveMaximum' && typeof x === 'boolean') {
      if (x && typeof v.maximum === 'number') out[k] = v.maximum;
    } else out[k] = schema(x);
  }
  if (v.nullable) return {anyOf: [out, {type: 'null'}]};
  return out;
}
function reachableDefs(root, defs) {
  const out = {}; const seen = new Set();
  const walk = v => {
    if (!v || typeof v !== 'object') return;
    if (typeof v.$ref === 'string' && v.$ref.startsWith('#/$defs/')) {
      const key = v.$ref.slice(8).split('/')[0].replace(/~1/g,'/').replace(/~0/g,'~');
      if (!seen.has(key)) { seen.add(key); if (!Object.hasOwn(defs,key)) throw new Error('Missing schema definition'); out[key] = defs[key]; walk(defs[key]); }
    }
    for (const child of Object.values(v)) walk(child);
  }; walk(root); return out;
}
export function compileSpec(doc, {id, baseUrl} = {}) {
  if (!/^3\.[01]\./.test(doc.openapi || '')) throw new Error('Supported: OpenAPI 3.0 and 3.1. Convert Swagger 2.0 first.');
  if (!/^[a-z][a-z0-9_-]{0,39}$/.test(id || '')) throw new Error('Invalid platform id');
  const tools = [], skipped = [], names = new Set();
  const defs = schema(doc.components?.schemas || {});
  const server = baseUrl || doc.servers?.[0]?.url;
  if (!server || server.includes('{')) throw new Error('A concrete baseUrl is required');
  for (const [path, rawItem] of Object.entries(doc.paths || {})) {
    const item = resolve(doc, rawItem);
    for (const method of METHODS) {
      if (!item[method]) continue;
      const op = resolve(doc, item[method]);
      try {
        if (!baseUrl && (item.servers || op.servers)) throw new Error('Operation-specific servers require an explicit baseUrl');
        const all = [...(item.parameters || []), ...(op.parameters || [])].map(p => resolve(doc, p));
        const params = [...new Map(all.map(p => [p.in + ':' + p.name, p])).values()];
        const groups = {}, required = [], bindings = [];
        for (const p of params) {
          if (!['path', 'query', 'header'].includes(p.in)) throw new Error('Cookie parameters are unsupported');
          if (!p.schema) throw new Error('Parameter content encoding is unsupported');
          const type = resolve(doc, p.schema).type;
          const style = p.style || (p.in === 'query' ? 'form' : 'simple');
          if (style !== (p.in === 'query' ? 'form' : 'simple') || !['string', 'integer', 'number', 'boolean', 'array'].includes(type)) throw new Error('Complex parameter serialization is unsupported');
          if (type === 'array' && !['string','integer','number','boolean'].includes(resolve(doc, p.schema.items || {}).type)) throw new Error('Complex array serialization is unsupported');
          groups[p.in] ||= {type: 'object', properties: {}, required: [], additionalProperties: false};
          groups[p.in].properties[p.name] = schema(p.schema);
          if (p.required || p.in === 'path') groups[p.in].required.push(p.name);
          bindings.push({name: p.name, in: p.in, style, explode: p.explode ?? p.in === 'query'});
        }
        for (const [k, v] of Object.entries(groups)) if (v.required.length) required.push(k);
        let contentType;
        if (op.requestBody) {
          const body = resolve(doc, op.requestBody);
          contentType = ['application/json', 'application/x-www-form-urlencoded'].find(t => body.content?.[t]);
          if (!contentType) throw new Error('Only JSON and form request bodies are supported');
          groups.body = schema(body.content[contentType].schema || {});
          if (body.required) required.push('body');
        }
        let name = `${id}__${safeName(op.operationId || method + '_' + path)}`;
        if (name.length > 64) name = name.slice(0, 51) + '_' + createHash('sha256').update(name).digest('hex').slice(0,12);
        if (names.has(name)) throw new Error('Duplicate operation name');
        names.add(name);
        tools.push({name, platform: id, operationId: op.operationId, method: method.toUpperCase(), path,
          description: String(op.summary || op.description || `${method.toUpperCase()} ${path}`).slice(0, 600),
          inputSchema: {type: 'object', properties: groups, required, additionalProperties: false, $defs: reachableDefs(groups, defs)},
          bindings, contentType, security: op.security ?? doc.security ?? [],
          annotations: {readOnlyHint: ['get', 'head'].includes(method), destructiveHint: !['get','head'].includes(method), openWorldHint: true}});
      } catch (e) { skipped.push({method, path, reason: e.message}); }
    }
  }
  return {id, title: doc.info?.title || id, version: doc.info?.version, baseUrl: server,
    securitySchemes: doc.components?.securitySchemes || {}, tools, skipped};
}
// Avoid duplicating shared component schemas once per operation on disk.
export function packCompiled(c) {
  const definitions = Object.assign({}, ...c.tools.map(t=>t.inputSchema.$defs));
  return {...c, definitions, tools: c.tools.map(t => ({...t, inputSchema: {...t.inputSchema, $defs: undefined}}))};
}
export function unpackCompiled(c) {
  const {definitions, ...rest} = c;
  return {...rest, tools: c.tools.map(t => ({...t, inputSchema: {...t.inputSchema, $defs: reachableDefs(t.inputSchema, definitions || {})}}))};
}
