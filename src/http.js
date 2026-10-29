import http from 'node:http';
import https from 'node:https';
import dns from 'node:dns';
import ipaddr from 'ipaddr.js';
export function publicAddress(address) {
  try { return ipaddr.process(address).range() === 'unicast'; } catch { return false; }
}
export async function request(url, {method = 'GET', headers = {}, body, allowLocalhost = false, timeoutMs = 15000, maxBytes = 1048576} = {}) {
  const u = new URL(url);
  if (u.username || u.password) throw new Error('URL credentials are forbidden');
  const local = allowLocalhost && ['127.0.0.1', 'localhost', '[::1]'].includes(u.hostname);
  if (u.protocol !== 'https:' && !(local && u.protocol === 'http:')) throw new Error('HTTPS is required');
  const literal = u.hostname.replace(/^\[|\]$/g, '');
  if (ipaddr.isValid(literal) && !publicAddress(literal) && !local) throw new Error('Private network destinations are blocked');
  return new Promise((resolve, reject) => {
    const req = (u.protocol === 'https:' ? https : http).request(u, {
      method, headers, signal: AbortSignal.timeout(timeoutMs),
      // Validate and pin the DNS answer used by this socket. No second DNS lookup.
      lookup: (hostname, options, cb) => dns.lookup(hostname, {all: true}, (error, addresses) => {
        if (error) return cb(error);
        if (!addresses.length || (!local && addresses.some(a => !publicAddress(a.address)))) return cb(new Error('Private network destinations are blocked'));
        const picked = addresses.find(a => a.family === 4) || addresses[0];
        cb(null, options.all ? [picked] : picked.address, picked.family);
      })
    }, res => {
      const chunks = []; let bytes = 0;
      res.on('data', chunk => {
        bytes += chunk.length;
        if (bytes > maxBytes) { req.destroy(new Error('Response exceeds byte limit')); return; }
        chunks.push(chunk);
      });
      res.on('error', reject);
      res.on('end', () => resolve({status: res.statusCode, contentType: res.headers['content-type'] || '', text: Buffer.concat(chunks).toString('utf8')}));
    });
    req.on('error', reject);
    req.end(body);
  });
}
