export function fixture(baseUrl='https://example.com') {return {openapi:'3.0.3',info:{title:'Fixture',version:'1'},servers:[{url:baseUrl}],components:{schemas:{Item:{type:'object',properties:{name:{type:'string'}}}},securitySchemes:{token:{type:'http',scheme:'bearer'}}},paths:{
 '/items/{id}':{get:{operationId:'getItem',parameters:[{name:'id',in:'path',required:true,schema:{type:'string'}},{name:'tags',in:'query',schema:{type:'array',items:{type:'string'}}}],responses:{}}},
 '/secure':{get:{operationId:'secure',security:[{token:[]}],responses:{}}},
 '/items':{post:{operationId:'create',requestBody:{required:true,content:{'application/json':{schema:{$ref:'#/components/schemas/Item'}}}},responses:{}}},
 '/form':{post:{operationId:'form',requestBody:{required:true,content:{'application/x-www-form-urlencoded':{schema:{type:'object',properties:{name:{type:'string'}},required:['name']}}}},responses:{}}},
 '/redirect':{get:{operationId:'redirect',responses:{}}}
}};}
