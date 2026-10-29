import {Client} from '@modelcontextprotocol/client';
import {StdioClientTransport} from '@modelcontextprotocol/client/stdio';
import {safeName} from './compiler.js';
import {createHash} from 'node:crypto';
export async function connectUpstreams(configs = []) {
  const connected=[];
  try {
    for (const config of configs) {
      if (!/^[a-z][a-z0-9_-]{0,24}$/.test(config.id || '')) throw new Error('Invalid upstream id');
      if (!config.command || !Array.isArray(config.allowTools) || !config.allowTools.length) throw new Error('Upstreams require an explicit command and nonempty allowTools');
      const env={};
      for (const key of ['PATH','HOME','USERPROFILE','SYSTEMROOT','TEMP','TMP',...(config.inheritEnv || [])]) {
        if (process.env[key] !== undefined) env[key]=process.env[key];
      }
      const transport=new StdioClientTransport({command:config.command,args:config.args || [],env,stderr:'pipe'});
      // Upstream stderr is deliberately not forwarded: third-party programs may log secrets.
      transport.stderr?.resume();
      const client=new Client({name:'omni-mcp-upstream',version:'0.1.1'});
      const entry={client,id:'local_'+config.id,tools:[]};connected.push(entry);
      await client.connect(transport);
      let cursor;let pages=0;
      do {
        const page=await client.listTools(cursor?{cursor}:{});
        for (const tool of page.tools) {
          if (!config.allowTools.includes(tool.name)) continue;
          let name=`${entry.id}__${safeName(tool.name)}`;
          if (name.length>64) name=name.slice(0,51)+'_'+createHash('sha256').update(name).digest('hex').slice(0,12);
          entry.tools.push({name,platform:entry.id,upstreamTool:tool.name,method:'LOCAL',path:tool.name,description:String(tool.description || tool.name).slice(0,600),inputSchema:tool.inputSchema,annotations:tool.annotations || {openWorldHint:true}});
        }
        cursor=page.nextCursor;if(++pages>100)throw new Error('Upstream discovery exceeded page limit');
      } while(cursor);
      const found=new Set(entry.tools.map(t=>t.upstreamTool));
      if(config.allowTools.some(name=>!found.has(name)))throw new Error('Configured upstream tool was not found');
    }
    return connected;
  } catch(e) {await Promise.allSettled(connected.map(x=>x.client.close()));throw e;}
}
