import {Server} from '@modelcontextprotocol/server';
import {StdioServerTransport} from '@modelcontextprotocol/server/stdio';
const server=new Server({name:'fixture-device',version:'1.0.0'},{capabilities:{tools:{}}});
server.setRequestHandler('tools/list',async()=>({tools:[
 {name:'echo',description:'Fixture echo only, no real device access',inputSchema:{type:'object',properties:{value:{type:'string'}},required:['value'],additionalProperties:false}},
 {name:'not_allowed',inputSchema:{type:'object'}}
]}));
server.setRequestHandler('tools/call',async r=>({content:[{type:'text',text:r.params.arguments.value}]}));
await server.connect(new StdioServerTransport());
