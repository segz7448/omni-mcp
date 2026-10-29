import Ajv from 'ajv';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import {request} from './http.js';
const ajv = new Ajv({strict: false, unicodeRegExp: false, allErrors: false, validateFormats: true});
addFormats(ajv);
const ajv2020 = new Ajv2020({strict:false,unicodeRegExp:false,allErrors:false});addFormats(ajv2020);
const blockedHeaders = /^(host|connection|content-length|transfer-encoding|cookie|authorization|proxy-.*)$/i;
function envValue(name) {
  if (!/^[A-Z_][A-Z0-9_]*$/.test(name || '')) throw new Error('Invalid credential environment variable name');
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  if (/[\r\n]/.test(value)) throw new Error('Invalid credential');
  return value;
}
export class Engine {
  constructor(platforms, upstreams = []) {
    this.platforms = [...platforms, ...upstreams.map(u=>({compiled:{id:u.id,title:u.id,tools:u.tools,skipped:[]},upstream:u}))];
    this.tools = new Map(); this.validators = new Map();
    for (const p of this.platforms) {
      for (const t of p.compiled.tools) {
        if (this.tools.has(t.name)) throw new Error('Duplicate tool name');
        this.tools.set(t.name, {t, p});
      }
    }
  }
  enabled(t, p) { return !!p.upstream || ['GET', 'HEAD'].includes(t.method) || (p.allowWriteOperations || []).includes(t.name); }
  list(query = '', platform, offset = 0, limit = 30) {
    const all = [...this.tools.values()].filter(({t,p}) => this.enabled(t,p) && (!platform || t.platform === platform) && `${t.name} ${t.description} ${t.path}`.toLowerCase().includes(query.toLowerCase()));
    return {total: all.length, offset, tools: all.slice(offset, offset + limit).map(({t}) => ({name:t.name, platform:t.platform, description:t.description, method:t.method, path:t.path}))};
  }
  describe(name) {
    const x = this.tools.get(name);
    if (!x || !this.enabled(x.t,x.p)) throw new Error('Unknown or disabled operation');
    return {name: x.t.name, description: x.t.description, inputSchema: x.t.inputSchema, annotations: x.t.annotations};
  }
  async execute(name, args = {}) {
    const x = this.tools.get(name);
    if (!x || !this.enabled(x.t,x.p)) throw new Error('Unknown or disabled operation');
    const {t,p} = x;
    if (!this.validators.has(name)) this.validators.set(name, (t.inputSchema.$schema?.includes('2020-12') ? ajv2020 : ajv).compile(t.inputSchema));
    if (!this.validators.get(name)(args)) throw new Error('Arguments do not match the operation input schema');
    if (p.upstream) {
      const result = await p.upstream.client.callTool({name:t.upstreamTool,arguments:args});
      return {ok:result.isError !== true,data:result};
    }
    const headers = {Accept: 'application/json', 'User-Agent': 'omni-mcp/0.1.0'};
    const secrets = [];
    let path = t.path;
    for (const b of t.bindings.filter(b => b.in === 'path')) {
      const value = args.path[b.name];
      const text = Array.isArray(value) ? value.map(v=>encodeURIComponent(String(v))).join(',') : encodeURIComponent(String(value));
      if (String(value) === '.' || String(value) === '..' || /[\r\n]/.test(String(value))) throw new Error('Invalid path value');
      path = path.replace(`{${b.name}}`, text);
    }
    if (path.includes('{') || !path.startsWith('/') || path.startsWith('//') || path.includes('\\')) throw new Error('Unsafe operation path');
    const base = new URL(p.compiled.baseUrl);
    if (base.search || base.hash) throw new Error('Base URL must not contain query or fragment');
    const url = new URL(base.href.replace(/\/$/, '') + path);
    if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname.replace(/\/$/, '') + '/')) throw new Error('Operation escaped the configured base');
    for (const b of t.bindings.filter(b => b.in !== 'path')) {
      const value = args[b.in]?.[b.name];
      if (value === undefined) continue;
      const values = Array.isArray(value) ? value.map(String) : [String(value)];
      if (b.in === 'query') {
        if (Array.isArray(value) && b.explode) values.forEach(v=>url.searchParams.append(b.name,v));
        else url.searchParams.set(b.name,values.join(','));
      } else {
        if (blockedHeaders.test(b.name) || /[\r\n]/.test(values.join(''))) throw new Error('Unsafe argument header');
        headers[b.name] = values.join(',');
      }
    }
    const apply = (name, v) => { if (/[\r\n]/.test(v) || /[\r\n]/.test(name)) throw new Error('Unsafe configured header'); headers[name] = v; };
    for (const [name, v] of Object.entries(p.headers || {})) {
      if (/^(host|connection|content-length|transfer-encoding|proxy-.*)$/i.test(name)) throw new Error('Unsafe configured header');
      if (typeof v === 'string') apply(name,v);
      else {const secret = envValue(v.env); secrets.push(secret); apply(name,(v.prefix || '') + secret);}
    }
    const schemes = p.compiled.securitySchemes;
    const requirements = t.security;
    if (requirements.length) {
      const choice = requirements.find(r => Object.keys(r).every(k => p.auth?.[k] && schemes[k]));
      if (!choice) throw new Error('No configured credentials for the required security schemes');
      for (const key of Object.keys(choice)) {
        const s = schemes[key], c = p.auth[key], token = envValue(c.env); secrets.push(token);
        if (s.type === 'apiKey' && s.in === 'header') apply(s.name,token);
        else if (s.type === 'apiKey' && s.in === 'query') url.searchParams.set(s.name,token);
        else if (s.type === 'http' && s.scheme?.toLowerCase() === 'basic') {
          const username = c.usernameEnv ? envValue(c.usernameEnv) : token;
          if (c.usernameEnv) secrets.push(username);
          const encoded = Buffer.from(`${username}:${c.usernameEnv ? token : ''}`).toString('base64');secrets.push(encoded);apply('Authorization',`Basic ${encoded}`);
        } else if (['oauth2','openIdConnect'].includes(s.type) || (s.type === 'http' && s.scheme?.toLowerCase() === 'bearer')) apply('Authorization',`Bearer ${token}`);
        else throw new Error('Unsupported security scheme');
      }
    }
    let body;
    if (args.body !== undefined) {
      headers['Content-Type'] = t.contentType;
      if (t.contentType === 'application/json') body = JSON.stringify(args.body);
      else if (t.contentType === 'application/x-www-form-urlencoded') {
        const form = new URLSearchParams();
        const walk = (v,k) => {
          if (v === null || v === undefined) return;
          if (Array.isArray(v)) v.forEach((x,i)=>walk(x,`${k}[${i}]`));
          else if (typeof v === 'object') Object.entries(v).forEach(([n,x])=>walk(x,k ? `${k}[${n}]` : n));
          else form.append(k,String(v));
        };walk(args.body,'');body=form.toString();
      } else throw new Error('Unsupported body encoding');
      if (Buffer.byteLength(body) > 1048576) throw new Error('Request body exceeds byte limit');
    }
    try {
      const response = await request(url, {method:t.method, headers, body, allowLocalhost: p.allowLocalhost === true});
      let text = response.text;
      for (const secret of secrets.sort((a,b)=>b.length-a.length)) text = text.split(secret).join('[REDACTED]');
      let data; try {data=JSON.parse(text);} catch {data=text;}
      return {status:response.status, ok: response.status >= 200 && response.status < 300, data};
    } catch { throw new Error('HTTP request failed or was blocked by network policy'); }
  }
}
