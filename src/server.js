import { Server } from '@modelcontextprotocol/server';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
const object = (properties, required = []) => ({type:'object', properties, required, additionalProperties:false});
const string = {type:'string'};
export function makeServer(engine) {
  const server = new Server({name:'omni-mcp', version:'0.1.0'}, {capabilities:{tools:{}}});
  const tools = [
    {name:'platforms',description:'List configured platforms and generation counts. This does not prove live API access.',inputSchema:object({})},
    {name:'search_operations',description:'Find enabled operations. Use describe_operation before calling.',inputSchema:object({query:string, platform:string, offset:{type:'integer',minimum:0}, limit:{type:'integer',minimum:1,maximum:50}})},
    {name:'describe_operation',description:'Get an operation JSON input schema and safety hints.',inputSchema:object({name:string},['name'])},
    {name:'call_operation',description:'Execute an enabled operation after inspecting its schema. Writes are disabled unless explicitly allowlisted in local configuration.',inputSchema:object({name:string,arguments:{type:'object'}},['name','arguments'])}
  ];
  server.setRequestHandler('tools/list', async () => ({tools}));
  server.setRequestHandler('tools/call', async req => {
    const a = req.params.arguments || {};
    try {
      let result;
      switch(req.params.name) {
        case 'platforms': result = engine.platforms.map(p=>({id:p.compiled.id,title:p.compiled.title,generated:p.compiled.tools.length,enabled:engine.list('',p.compiled.id,0,1).total,skipped:p.compiled.skipped.length})); break;
        case 'search_operations':
          if ((a.query !== undefined && typeof a.query !== 'string') || (a.platform !== undefined && typeof a.platform !== 'string') || !Number.isInteger(a.offset ?? 0) || (a.offset ?? 0)<0 || !Number.isInteger(a.limit ?? 30) || (a.limit ?? 30)<1 || (a.limit ?? 30)>50) throw new Error('Invalid search arguments');
          result=engine.list(a.query,a.platform,a.offset,a.limit);break;
        case 'describe_operation': result=engine.describe(a.name);break;
        case 'call_operation': result=await engine.execute(a.name,a.arguments);break;
        default: throw new Error('Unknown MCP tool');
      }
      return {content:[{type:'text',text:JSON.stringify(result)}],isError: result?.ok === false};
    } catch(e) {return {content:[{type:'text',text:e.message}],isError:true};}
  });
  return server;
}
export async function serve(engine) {await makeServer(engine).connect(new StdioServerTransport());}
